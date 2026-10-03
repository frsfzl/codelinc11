import { fieldInfo, requiredKeys, type Profile } from "./needs";
export type GuidedKey = "dependents" | "income" | (typeof requiredKeys)[number];
export function nextQuestion(
  profile: Profile,
  skippedIncome: boolean,
): GuidedKey | null {
  if (!profile.dependents) return "dependents";
  if (profile.income === null && !skippedIncome) return "income";
  return requiredKeys.find((key) => profile[key] === null) ?? null;
}
export function questionFor(key: GuidedKey | null): string {
  if (key === null)
    return "We have the numbers for a first estimate. Take a moment to review them, including any zero amounts, then confirm when they look right.";
  if (key === "dependents")
    return "Who would you want life insurance to help protect? A partner, children, someone else—or just yourself and your plans?";
  if (key === "income")
    return "What is your annual income? This is just context—we won’t assume your family needs your full salary. You can also skip this question.";
  if (key === "annualSupport")
    return "About how much would your family need each year after other income? Leave out mortgage or debt payments you plan to pay off separately, and education goals we’ll count later.";
  if (key === "years")
    return "For how many years would you want that family support to last? It can help to think about when children might be independent or a partner might retire.";
  return `What amount would you like to include for ${fieldInfo[key].label.toLowerCase()}? ${fieldInfo[key].help} Enter 0 if you want to exclude it.`;
}
export function parseAmount(text: string, key: GuidedKey): number | null {
  const clean = text.toLowerCase().replace(/[$,]/g, "").trim();
  if (/^(zero|none|no)$/.test(clean) && key !== "years") return 0;
  const match = clean.match(
    /^(\d+(?:\.\d{1,2})?)\s*(k|m)?\s*(?:(?:per |a |\/)?(month|monthly|mo|year|yearly|annually|yr|years))?$/,
  );
  if (!match) return null;
  let value =
    Number(match[1]) *
    (match[2] === "k" ? 1000 : match[2] === "m" ? 1000000 : 1);
  const unit = match[3];
  const monthly = unit && ["month", "monthly", "mo"].includes(unit);
  if (key === "years")
    return !match[2] &&
      !monthly &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 60
      ? value
      : null;
  if (unit && key !== "income" && key !== "annualSupport") return null;
  if (monthly) value *= 12;
  return value <= 100000000 ? Math.round(value * 100) / 100 : null;
}
