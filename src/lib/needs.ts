import { z } from "zod";

const money = z.number().finite().min(0).max(100_000_000).nullable();
export const profileSchema = z
  .object({
    dependents: z.string().max(500),
    income: money,
    annualSupport: money,
    years: z.number().int().min(1).max(60).nullable(),
    mortgage: money,
    debts: money,
    education: money,
    finalExpenses: money,
    otherNeeds: money,
    employerCoverage: money,
    personalCoverage: money,
    savings: money,
    budget: money,
    priorities: z.string().max(1000),
  })
  .strict();
export type Profile = z.infer<typeof profileSchema>;
export type NumericKey = {
  [K in keyof Profile]: Profile[K] extends number | null ? K : never;
}[keyof Profile];
export const fieldInfo: Record<
  NumericKey,
  { label: string; help: string; unit: string }
> = {
  income: {
    label: "Your income",
    help: "Context only. We do not automatically replace your full salary.",
    unit: "per year",
  },
  annualSupport: {
    label: "Family support",
    help: "What your family would need each year, after other income. Exclude mortgage or debts paid off below, and goals listed separately.",
    unit: "per year",
  },
  years: {
    label: "Support period",
    help: "How long would you want that support to last?",
    unit: "years",
  },
  mortgage: {
    label: "Mortgage to pay off",
    help: "The remaining balance you want covered, not your monthly payment.",
    unit: "one time",
  },
  debts: {
    label: "Other debts",
    help: "Debt you want paid off, excluding the mortgage.",
    unit: "one time",
  },
  education: {
    label: "Education goals",
    help: "The total amount you want to set aside.",
    unit: "one time",
  },
  finalExpenses: {
    label: "Final expenses",
    help: "Any amount you choose to include for final costs.",
    unit: "one time",
  },
  otherNeeds: {
    label: "Other goals",
    help: "Other one-time needs not already included.",
    unit: "one time",
  },
  employerCoverage: {
    label: "Employer life insurance",
    help: "Coverage in place today. Continuation after leaving a job depends on your policy.",
    unit: "coverage",
  },
  personalCoverage: {
    label: "Personal life insurance",
    help: "Existing individual coverage you want counted.",
    unit: "coverage",
  },
  savings: {
    label: "Savings set aside",
    help: "Only savings you want to allocate to these needs. Do not include an emergency fund or other assets unless you choose to.",
    unit: "available",
  },
  budget: {
    label: "Comfortable monthly budget",
    help: "Optional context for your priorities. This is not a premium quote.",
    unit: "per month",
  },
};
export const requiredKeys = [
  "annualSupport",
  "years",
  "mortgage",
  "debts",
  "education",
  "finalExpenses",
  "otherNeeds",
  "employerCoverage",
  "personalCoverage",
  "savings",
] as const;
export const emptyProfile: Profile = {
  dependents: "",
  income: null,
  annualSupport: null,
  years: null,
  mortgage: null,
  debts: null,
  education: null,
  finalExpenses: null,
  otherNeeds: null,
  employerCoverage: null,
  personalCoverage: null,
  savings: null,
  budget: null,
  priorities: "",
};
export const exampleProfile: Profile = {
  dependents: "My partner and two children, ages 3 and 7",
  income: 80000,
  annualSupport: 40000,
  years: 15,
  mortgage: 220000,
  debts: 0,
  education: 80000,
  finalExpenses: 0,
  otherNeeds: 0,
  employerCoverage: 150000,
  personalCoverage: 0,
  savings: 50000,
  budget: null,
  priorities: "Keep everyday life stable and help my children through school.",
};
export const currency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export function missingFields(profile: Profile) {
  return requiredKeys.filter((key) => profile[key] === null);
}
export interface LineItem {
  label: string;
  amount: number;
  detail?: string;
}
export interface Estimate {
  needs: LineItem[];
  resources: LineItem[];
  totalNeeds: number;
  totalResources: number;
  additional: number;
  assumptions: string[];
}
export function calculateNeeds(input: Profile): Estimate {
  const p = profileSchema.parse(input);
  const missing = missingFields(p);
  if (missing.length)
    throw new Error(
      `Please provide or explicitly enter zero for: ${missing.map((k) => fieldInfo[k].label).join(", ")}.`,
    );
  // Money is rounded to cents before aggregation; the UI displays whole dollars.
  const cents = (value: number) => Math.round(value * 100);
  const needs: LineItem[] = [
    {
      label: "Family support",
      amount: (cents(p.annualSupport!) * p.years!) / 100,
      detail: `${currency(p.annualSupport!)} a year × ${p.years} years`,
    },
    { label: "Mortgage", amount: cents(p.mortgage!) / 100 },
    { label: "Other debts", amount: cents(p.debts!) / 100 },
    { label: "Education", amount: cents(p.education!) / 100 },
    { label: "Final expenses", amount: cents(p.finalExpenses!) / 100 },
    { label: "Other goals", amount: cents(p.otherNeeds!) / 100 },
  ];
  const resources: LineItem[] = [
    { label: "Employer coverage", amount: cents(p.employerCoverage!) / 100 },
    { label: "Personal coverage", amount: cents(p.personalCoverage!) / 100 },
    { label: "Allocated savings", amount: cents(p.savings!) / 100 },
  ];
  const totalNeeds =
    needs.reduce((sum, item) => sum + cents(item.amount), 0) / 100;
  const totalResources =
    resources.reduce((sum, item) => sum + cents(item.amount), 0) / 100;
  return {
    needs,
    resources,
    totalNeeds,
    totalResources,
    additional: Math.max(
      0,
      Math.round((totalNeeds - totalResources) * 100) / 100,
    ),
    assumptions: [
      "Family support excludes balances and goals counted separately.",
      "Only the savings you chose to allocate are counted.",
      "This simplified estimate does not model inflation, investment returns, taxes, or changes in your needs.",
      "Existing coverage is counted as entered; policy terms and future availability need separate review.",
    ],
  };
}
export const scenarioSchema = z
  .object({
    years: z.number().int().min(1).max(60).optional(),
    excludeEmployer: z.boolean().optional(),
  })
  .strict();
export type Scenario = z.infer<typeof scenarioSchema>;
export function calculateScenario(profile: Profile, scenario: Scenario) {
  const s = scenarioSchema.parse(scenario);
  if (s.years !== undefined && s.excludeEmployer)
    throw new Error(
      "Compare one change at a time: years or employer coverage.",
    );
  return calculateNeeds({
    ...profile,
    ...(s.years === undefined ? {} : { years: s.years }),
    ...(s.excludeEmployer ? { employerCoverage: 0 } : {}),
  });
}
export interface ProfileState {
  profile: Profile;
  revision: number;
  confirmedRevision: number | null;
}
export function applyProfilePatch(
  state: ProfileState,
  patch: unknown,
  expectedRevision: number,
): ProfileState {
  if (expectedRevision !== state.revision)
    throw new Error(
      "The profile changed. Read the latest profile and ask again before updating it.",
    );
  const parsed = profileSchema.partial().parse(patch);
  return {
    profile: profileSchema.parse({ ...state.profile, ...parsed }),
    revision: state.revision + 1,
    confirmedRevision: null,
  };
}
export function confirmedEstimate(
  state: ProfileState,
  expectedRevision: number,
) {
  if (
    state.revision !== expectedRevision ||
    state.confirmedRevision !== state.revision
  )
    throw new Error(
      "Ask the customer to review and confirm the current inputs using Review my numbers before calculating.",
    );
  return calculateNeeds(state.profile);
}
