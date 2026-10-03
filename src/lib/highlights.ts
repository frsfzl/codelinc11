import {
  calculateNeeds,
  currency,
  type LineItem,
  type Profile,
  type ProfileState,
} from "./needs";

export type HighlightKey =
  "people" | "support" | "goals" | "resources" | "estimate";
export interface Highlight {
  key: HighlightKey;
  title: string;
  value: string;
  detail: string;
}
const goalFields = [
  "mortgage",
  "debts",
  "education",
  "finalExpenses",
  "otherNeeds",
] as const;
const resourceFields = [
  "employerCoverage",
  "personalCoverage",
  "savings",
] as const;
const goalLabels = [
  "Mortgage",
  "Other debts",
  "Education",
  "Final expenses",
  "Other goals",
];
const resourceLabels = [
  "Employer coverage",
  "Personal coverage",
  "Allocated savings",
];

export function capturedBreakdown(profile: Profile) {
  const needs: LineItem[] = [];
  if (profile.annualSupport !== null && profile.years !== null)
    needs.push({
      label: "Family support",
      amount: profile.annualSupport * profile.years,
      detail: `${currency(profile.annualSupport)} a year × ${profile.years} years`,
    });
  goalFields.forEach((key, i) => {
    if (profile[key] !== null)
      needs.push({ label: goalLabels[i], amount: profile[key] });
  });
  const resources: LineItem[] = [];
  resourceFields.forEach((key, i) => {
    if (profile[key] !== null)
      resources.push({ label: resourceLabels[i], amount: profile[key] });
  });
  return { needs, resources };
}

export function getHighlights(state: ProfileState): Highlight[] {
  const p = state.profile;
  const highlights: Highlight[] = [];
  if (p.dependents || p.priorities)
    highlights.push({
      key: "people",
      title: "People & priorities",
      value: p.dependents || p.priorities,
      detail:
        p.dependents && p.priorities ? p.priorities : "What matters to you",
    });
  if (
    p.annualSupport !== null ||
    p.years !== null ||
    p.income !== null ||
    p.budget !== null
  ) {
    const details = [
      p.years !== null ? `${p.years} years of support` : "",
      p.income !== null ? `${currency(p.income)} annual income` : "",
      p.budget !== null ? `${currency(p.budget)}/month budget` : "",
    ].filter(Boolean);
    highlights.push({
      key: "support",
      title: "Everyday support",
      value:
        p.annualSupport !== null
          ? `${currency(p.annualSupport)} / year`
          : details.shift()!,
      detail: details.join(" · ") || "Family support captured",
    });
  }
  const goals = goalFields.filter((key) => p[key] !== null && p[key]! > 0);
  if (goals.length)
    highlights.push({
      key: "goals",
      title: "Future commitments",
      value: currency(goals.reduce((sum, key) => sum + p[key]!, 0)),
      detail: goals
        .map((key) => goalLabels[goalFields.indexOf(key)])
        .join(" · "),
    });
  const resources = resourceFields.filter(
    (key) => p[key] !== null && p[key]! > 0,
  );
  if (resources.length)
    highlights.push({
      key: "resources",
      title: "Already in place",
      value: currency(resources.reduce((sum, key) => sum + p[key]!, 0)),
      detail: resources
        .map((key) => resourceLabels[resourceFields.indexOf(key)])
        .join(" · "),
    });
  if (state.confirmedRevision === state.revision)
    highlights.push({
      key: "estimate",
      title: "Your coverage picture",
      value: currency(calculateNeeds(p).additional),
      detail: "Estimated additional coverage",
    });
  return highlights;
}
