import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyProfilePatch,
  calculateNeeds,
  calculateScenario,
  confirmedEstimate,
  emptyProfile,
  exampleProfile,
  profileSchema,
} from "../src/lib/needs";

test("illustrative family has $900k needs, $200k resources, and a $700k gap", () => {
  const r = calculateNeeds(exampleProfile);
  assert.equal(r.totalNeeds, 900000);
  assert.equal(r.totalResources, 200000);
  assert.equal(r.additional, 700000);
});
test("scenarios independently preserve the original and never compound accidentally", () => {
  assert.equal(
    calculateScenario(exampleProfile, { years: 10 }).additional,
    500000,
  );
  assert.equal(
    calculateScenario(exampleProfile, { excludeEmployer: true }).additional,
    850000,
  );
  assert.equal(exampleProfile.years, 15);
  assert.equal(exampleProfile.employerCoverage, 150000);
});
test("sufficient resources cannot produce negative additional coverage", () => {
  assert.equal(
    calculateNeeds({ ...exampleProfile, savings: 1e6 }).additional,
    0,
  );
});
test("unknown values are not silently treated as zero", () => {
  assert.throws(() => calculateNeeds(emptyProfile), /Family support/);
  assert.throws(
    () => calculateNeeds({ ...exampleProfile, personalCoverage: null }),
    /Personal life/,
  );
  assert.equal(
    calculateNeeds({ ...exampleProfile, personalCoverage: 0 }).additional,
    700000,
  );
});
test("bad units and untrusted data must be rejected at the calculation boundary", () => {
  for (const years of [-1, 0, 1.5, 61, Infinity, NaN])
    assert.equal(
      profileSchema.safeParse({ ...exampleProfile, years }).success,
      false,
    );
  assert.throws(() => calculateNeeds({ ...exampleProfile, savings: -1 }));
  assert.throws(() =>
    applyProfilePatch(
      { profile: exampleProfile, revision: 1, confirmedRevision: 1 },
      { monthlySupport: 4000 },
      1,
    ),
  );
});
test("Profile updates cannot silently confirm inputs or overwrite newer corrections", () => {
  const initial = {
    profile: exampleProfile,
    revision: 2,
    confirmedRevision: 2,
  };
  assert.throws(
    () => applyProfilePatch(initial, { mortgage: 100 }, 1),
    /profile changed/,
  );
  assert.throws(() => applyProfilePatch(initial, { confirmedRevision: 2 }, 2));
  const edited = applyProfilePatch(initial, { annualSupport: 30000 }, 2);
  assert.equal(edited.confirmedRevision, null);
  assert.throws(() => confirmedEstimate(edited, 3), /review_profile/);
  assert.throws(() => confirmedEstimate(initial, 1), /review_profile/);
  assert.equal(confirmedEstimate(initial, 2).additional, 700000);
});
test("income and unallocated budget never silently change the calculation", () => {
  assert.equal(
    calculateNeeds({ ...exampleProfile, income: 1e6, budget: 1000 }).additional,
    700000,
  );
});
test("cent precision is retained while displaying whole-dollar estimates", () => {
  const result = calculateNeeds({
    ...exampleProfile,
    annualSupport: 100.01,
    years: 3,
    mortgage: 0,
    education: 0,
    employerCoverage: 0,
    savings: 0,
  });
  assert.equal(result.additional, 300.03);
});
