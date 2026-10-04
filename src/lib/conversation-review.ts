import { currency, fieldInfo, missingFields, type ProfileState } from "./needs";

export interface ConversationReview {
  revision: number;
  afterUserMessage: number;
  summary: string;
}

export function prepareReview(
  state: ProfileState,
  expectedRevision: number,
  userMessage: number,
): ConversationReview {
  if (state.revision !== expectedRevision)
    throw new Error("Read the latest profile before summarizing it.");
  const missing = missingFields(state.profile);
  if (!state.profile.dependents.trim() || missing.length)
    throw new Error(
      `Keep asking questions in conversation. Still needed: ${[!state.profile.dependents.trim() ? "people or purpose" : "", ...missing.map((key) => fieldInfo[key].label)].filter(Boolean).join(", ")}. Never assume missing amounts are zero.`,
    );
  const p = state.profile;
  const recapFields = [
    ["mortgage", "Mortgage"],
    ["debts", "Other debts"],
    ["education", "Education"],
    ["finalExpenses", "Final expenses"],
    ["otherNeeds", "Other goals"],
    ["employerCoverage", "Employer coverage"],
    ["personalCoverage", "Personal coverage"],
    ["savings", "Allocated savings"],
  ] as const;
  const amounts = recapFields
    .filter(([key]) => p[key] !== 0)
    .map(([key, label]) => `${label}: ${currency(p[key]!)}`);
  const excluded = recapFields
    .filter(([key]) => p[key] === 0)
    .map(([, label]) => label.toLowerCase());
  const summary = [
    `Family support: ${currency(p.annualSupport!)} a year for ${p.years} years.`,
    ...(amounts.length ? [`${amounts.join("; ")}.`] : []),
    ...(excluded.length ? [`Excluded ($0): ${excluded.join(", ")}.`] : []),
    "Is that correct?",
  ].join("\n");
  return {
    revision: state.revision,
    afterUserMessage: userMessage,
    summary,
  };
}

export function isClearConfirmation(text: string) {
  const normalized = text.toLowerCase().replace(/[’']/g, "");
  if (
    /\b(no|not|dont|except|but|change|actually|wrong|incorrect|wait|unsure|maybe|think|guess|if)\b|[\d?$]/.test(
      normalized,
    )
  )
    return false;
  return /^(yes|yep|yeah|correct|confirmed|absolutely|sure|exactly)\b|\b(looks? (good|right|correct)|sounds? (good|right|correct)|all correct|thats (right|correct)|that is (right|correct)|go ahead|everything is (right|correct))\b/.test(
    normalized.trim(),
  );
}

export function confirmInConversation(
  state: ProfileState,
  review: ConversationReview | null,
  latestUser: { id: number; text: string } | null,
  quote: string,
): ProfileState {
  if (
    !review ||
    review.revision !== state.revision ||
    !latestUser ||
    latestUser.id <= review.afterUserMessage ||
    latestUser.text.trim() !== quote.trim() ||
    !isClearConfirmation(quote)
  )
    throw new Error(
      "Summarize the current numbers in chat, then wait for the customer to confirm they are correct. Use their exact latest reply. If they correct anything, update it and summarize again. Do not send them to a form.",
    );
  return { ...state, confirmedRevision: state.revision };
}
