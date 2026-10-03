import { test } from "node:test";
import assert from "node:assert/strict";
import { nextQuestion, parseAmount } from "../src/lib/guided";
import {
  calculateScenario,
  emptyProfile,
  exampleProfile,
} from "../src/lib/needs";
test("guided entry converts explicit monthly support and accepts annual shorthand", () => {
  assert.equal(parseAmount("$3,000 per month", "annualSupport"), 36000);
  assert.equal(parseAmount("40k", "annualSupport"), 40000);
  assert.equal(parseAmount("80,000/year", "income"), 80000);
});
test("ambiguous and invalid units never become silent estimates", () => {
  assert.equal(parseAmount("$500/month", "mortgage"), null);
  assert.equal(parseAmount("40k and 220k", "annualSupport"), null);
  assert.equal(parseAmount("15 months", "years"), null);
  assert.equal(parseAmount("0", "years"), null);
  assert.equal(parseAmount("none", "debts"), 0);
});
test("guided questions preserve unknown values and can skip optional income", () => {
  assert.equal(nextQuestion(emptyProfile, false), "dependents");
  assert.equal(
    nextQuestion({ ...emptyProfile, dependents: "My partner" }, true),
    "annualSupport",
  );
  assert.equal(nextQuestion(exampleProfile, false), null);
});
test("one-change scenarios reject confusing combinations", () => {
  assert.throws(
    () =>
      calculateScenario(exampleProfile, { years: 10, excludeEmployer: true }),
    /one change/,
  );
});
