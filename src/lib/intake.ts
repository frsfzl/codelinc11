import { z } from "zod";
import {
  applyProfilePatch,
  currency,
  fieldInfo,
  profileSchema,
  type NumericKey,
  type ProfileState,
} from "./needs";

const educationPlanSchema = z
  .object({
    annualAmount: z.number().finite().min(0).max(100_000_000).nullable(),
    years: z.number().int().min(1).max(60).nullable(),
    scope: z.enum(["combined", "per-person", "unknown"]),
    people: z.number().int().min(1).max(30).nullable(),
  })
  .strict();

export function educationClarification(
  plan: NonNullable<ProfileState["educationPlan"]>,
) {
  const missing = [
    plan.annualAmount === null ? "annual amount" : "",
    plan.years === null ? "number of years" : "",
    plan.scope === "unknown"
      ? "whether this covers everyone or each person"
      : "",
    plan.scope === "per-person" && plan.people === null
      ? "number of people"
      : "",
  ].filter(Boolean);
  return missing.length
    ? `${plan.annualAmount === null ? "Annual education cost" : `${currency(plan.annualAmount)}/year`}: clarify ${missing.join(" and ")}.`
    : "";
}

// A narrow unit guard supplements the agent, so an explicit annual education
// correction cannot become a one-time amount while a follow-up is still needed.
export function captureClarifications(
  state: ProfileState,
  text: string,
  previousAssistant = "",
): ProfileState {
  const annualUnit =
    /(?:per\s+year|a\s+year|each\s+year|annually|yearly|annual|\/\s*(?:yr|year))\b/i;
  const educationClauses = text.split(/(?<=[.!?;])\s+|\n/).map((clause) => {
    const index = clause.search(/education|college|tuition|school/i);
    return index < 0 ? "" : clause.slice(index);
  });
  const educationClause =
    educationClauses.find((clause) => annualUnit.test(clause)) ??
    (/education|college|tuition/i.test(previousAssistant) &&
    previousAssistant.length < 400 &&
    text.length < 150 &&
    !/income|salary|support|mortgage|budget|insurance|coverage|savings/i.test(
      text,
    )
      ? text
      : "");
  const annual = annualUnit.test(educationClause);
  const clarifications = { ...state.clarifications };
  const patch: Record<string, number | null> = {};
  let educationPlan = state.educationPlan;
  if (
    annual &&
    (!state.educationPlan ||
      educationClauses.some((clause) => annualUnit.test(clause)))
  ) {
    const amount = educationClause.match(
      /\$?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(k|thousand)?\s*(?:per\s+year|a\s+year|each\s+year|annually|yearly|\/\s*(?:yr|year))/i,
    );
    const value = amount
      ? Number(amount[1].replaceAll(",", "")) * (amount[2] ? 1000 : 1)
      : null;
    educationPlan = {
      annualAmount: value !== null && value <= 100_000_000 ? value : null,
      years: null,
      scope: "unknown",
      people: null,
    };
    patch.education = null;
    clarifications.education = educationClarification(educationPlan);
  }
  const uncertain =
    /(?:don['’]?t know|do not know|not sure|unknown|unconfirmed|not confirmed|unsure)/i;
  const fields: [NumericKey, RegExp][] = [
    [
      "employerCoverage",
      /(?:employer|work|job).{0,40}(?:coverage|insurance)|(?:coverage|insurance).{0,30}(?:work|employer|job)/i,
    ],
    [
      "personalCoverage",
      /(?:personal|individual).{0,25}(?:coverage|insurance)/i,
    ],
    ["savings", /savings/i],
  ];
  for (const [key, subject] of fields) {
    // Keep uncertainty scoped to a sentence, rather than unrelated facts.
    const clauses = text.split(/(?<=[.!?])\s+|;|\n/);
    if (
      clauses.some(
        (clause) => subject.test(clause) && uncertain.test(clause),
      ) ||
      (text.length < 80 &&
        uncertain.test(text) &&
        subject.test(previousAssistant))
    ) {
      patch[key] = null;
      clarifications[key] = "Amount unknown. Confirm before including it.";
    }
  }
  if (!Object.keys(patch).length) return state;
  const changedNumber = Object.entries(patch).some(
    ([key, value]) => state.profile[key as NumericKey] !== value,
  );
  return {
    ...applyProfilePatch(state, patch, state.revision),
    // Pending metadata alone must not race an agent updating the same turn.
    revision: changedNumber ? state.revision + 1 : state.revision,
    educationPlan,
    clarifications,
  };
}

export function applyIntakePatch(
  state: ProfileState,
  input: unknown,
  expectedRevision: number,
  sourceText = "",
): ProfileState {
  const parsed = profileSchema
    .partial()
    .extend({
      educationPlan: educationPlanSchema.partial().nullable().optional(),
    })
    .strict()
    .parse(input);
  const { educationPlan: suppliedPlan, ...patch } = parsed;
  const plan =
    suppliedPlan === undefined
      ? state.educationPlan
      : suppliedPlan === null
        ? null
        : educationPlanSchema.parse({
            annualAmount: null,
            years: null,
            scope: "unknown",
            people: null,
            ...state.educationPlan,
            ...suppliedPlan,
          });
  const notes = { ...state.clarifications };
  for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
    if (!(key in fieldInfo)) continue;
    if (
      patch[key] === 0 &&
      state.clarifications?.[key as NumericKey] &&
      /don['’]?t know|do not know|not sure|unknown|unconfirmed|not confirmed|unsure/i.test(
        sourceText,
      )
    ) {
      // An uncertain answer cannot silently become an exclusion.
      (patch as Record<string, unknown>)[key] = null;
    }
    if (patch[key] === null)
      notes[key as NumericKey] = "Amount unknown. Confirm before including it.";
    else delete notes[key as NumericKey];
  }
  // Clearing a pending annual basis requires explicit replacement with a total.
  if (
    suppliedPlan === null &&
    patch.education === undefined &&
    state.educationPlan
  )
    throw new Error(
      "Provide the customer's explicit one-time education total when clearing the annual basis, or complete educationPlan.",
    );
  if (
    suppliedPlan === null &&
    state.educationPlan &&
    (!/\b(total|one.time|none|zero)\b/i.test(sourceText) ||
      /\bnot\b[^.!?]{0,40}\btotal\b/i.test(sourceText))
  )
    throw new Error(
      "The customer has not explicitly replaced the annual education plan with a one-time total. Keep educationPlan and ask the missing duration or scope question.",
    );
  if (plan) {
    const clarification = educationClarification(plan);
    if (clarification) {
      patch.education = null;
      notes.education = clarification;
    } else {
      patch.education =
        (Math.round(plan.annualAmount! * 100) *
          plan.years! *
          (plan.scope === "per-person" ? plan.people! : 1)) /
        100;
      delete notes.education;
    }
  } else if (patch.education !== undefined && patch.education !== null) {
    delete notes.education;
  }
  return {
    ...applyProfilePatch(state, patch, expectedRevision),
    educationPlan: plan,
    clarifications: notes,
  };
}
