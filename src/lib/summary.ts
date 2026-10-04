import {
  calculateNeeds,
  calculateScenario,
  currency,
  fieldInfo,
  missingFields,
  type ProfileState,
} from "./needs";
import { capturedBreakdown } from "./highlights";

export const policyComparison = [
  {
    label: "Duration",
    term: "A chosen period, subject to policy terms.",
    whole: "Designed for life, if premiums and conditions are met.",
  },
  {
    label: "Cost considerations",
    term: "Generally lower initial premiums for the same coverage.",
    whole: "Typically higher premiums and a longer commitment.",
  },
  {
    label: "Cash value",
    term: "Generally none.",
    whole: "Includes cash value; access can affect policy benefits.",
  },
  {
    label: "What to check",
    term: "What happens at expiry, renewal, and conversion.",
    whole: "Affordability, guarantees, and cash-value rules.",
  },
];

export function personalTradeoffs(state: ProfileState) {
  const p = state.profile;
  const items: { title: string; detail: string }[] = [];
  if (p.annualSupport !== null && p.years !== null)
    items.push({
      title: `${p.years} years of family support`,
      detail: `Your ${currency(p.annualSupport)} yearly support goal has a defined horizon. Compare a term that fits this need with the commitment of lifelong coverage. Your support horizon is not a promised policy term.`,
    });
  if (p.priorities)
    items.push({
      title: "Start with your stated priority",
      detail: `You shared: “${p.priorities}” A temporary need and a lasting responsibility may call for different coverage durations. Compare those goals before choosing a policy type.`,
    });
  if (p.employerCoverage !== null && p.employerCoverage > 0)
    items.push({
      title: `${currency(p.employerCoverage)} tied to employer coverage`,
      detail:
        state.confirmedRevision === state.revision &&
        missingFields(p).length === 0
          ? `If that coverage were unavailable, the additional estimate would be ${currency(calculateScenario(p, { excludeEmployer: true }).additional)}. Check the actual continuation terms; this is a hypothetical, not a prediction.`
          : "This amount is part of your captured resources. Check the actual continuation terms and compare what changes if it is unavailable.",
    });
  if (p.budget !== null)
    items.push({
      title: `${currency(p.budget)} per month is your comfort level`,
      detail:
        "Compare actual quotes for the same coverage amount and duration. This preference does not establish a premium or guarantee either option fits your budget.",
    });
  if (!items.length)
    items.push({
      title: "Your goals shape the comparison",
      detail:
        "Tell Linc who you want to protect, for how long, and what costs feel sustainable. Specific tradeoffs will appear as those details are captured.",
    });
  return items;
}

export function buildSummary(state: ProfileState) {
  const missing = missingFields(state.profile);
  const confirmed =
    state.confirmedRevision === state.revision &&
    missing.length === 0 &&
    Boolean(state.profile.dependents.trim());
  const estimate = confirmed ? calculateNeeds(state.profile) : null;
  const status = confirmed
    ? "Confirmed"
    : missing.length || !state.profile.dependents.trim()
      ? "Incomplete"
      : "Needs confirmation";
  const unknowns = [
    ...(!state.profile.dependents.trim()
      ? ["People or purpose: still to discuss."]
      : []),
    ...missing.map(
      (key) =>
        `${fieldInfo[key].label}: ${state.clarifications?.[key] || "not yet confirmed"}`,
    ),
  ];
  const basis = state.educationPlan;
  const educationDetail =
    basis && basis.annualAmount !== null
      ? `${currency(basis.annualAmount)}/year${basis.years === null ? " · duration needed" : ` × ${basis.years} years`}${basis.scope === "per-person" ? ` × ${basis.people ?? "?"} people` : basis.scope === "combined" ? " · everyone combined" : " · who this covers needs clarification"}`
      : null;
  const breakdown = estimate ?? capturedBreakdown(state.profile);
  return {
    status,
    confirmed,
    estimate,
    unknowns,
    educationDetail,
    needs: breakdown.needs.map((item) =>
      item.label === "Education" && educationDetail
        ? { ...item, detail: educationDetail }
        : item,
    ),
    resources: breakdown.resources,
    tradeoffs: personalTradeoffs(state),
    assumptions: estimate?.assumptions ?? [
      "Only captured amounts are shown. Unknowns are not counted as zero.",
      "This summary is incomplete or awaiting confirmation; it is not a final coverage estimate.",
    ],
    nextSteps: confirmed
      ? [
          "Compare actual policy terms and quotes with a licensed professional.",
          "Check existing policy benefits and availability before relying on them.",
          "Revisit this estimate when your family, income, or goals change.",
        ]
      : [
          "Continue with Linc to clarify the outstanding details.",
          "Review the updated recap in conversation before calculating coverage.",
        ],
  };
}
