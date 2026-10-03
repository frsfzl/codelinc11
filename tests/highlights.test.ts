import { test } from "node:test";
import assert from "node:assert/strict";
import {
  capturedBreakdown,
  getHighlights,
  conciseDetail,
} from "../src/lib/highlights";
import { emptyProfile, exampleProfile } from "../src/lib/needs";

test("older verbatim people entries display one sentence without unrelated finances", () => {
  assert.equal(
    conciseDetail("My wife and two kids. I earn $80,000 a year."),
    "My wife and two kids.",
  );
  assert.equal(
    conciseDetail("Wife and two children, ages 3 and 7."),
    "Wife and two children, ages 3 and 7.",
  );
});

test("highlights contain captured facts only and never guess missing amounts", () => {
  const state = {
    profile: { ...emptyProfile },
    revision: 0,
    confirmedRevision: null,
  };
  assert.deepEqual(getHighlights(state), []);
  state.profile.dependents = "My partner";
  assert.deepEqual(
    getHighlights(state).map((item) => item.key),
    ["people"],
  );
  state.profile.annualSupport = 30_000;
  assert.deepEqual(
    getHighlights(state).map((item) => item.key),
    ["people", "support"],
  );
  assert.deepEqual(capturedBreakdown(state.profile).needs, []);
});
test("charts preserve explicit zero and require both annual support and years", () => {
  const p = {
    ...emptyProfile,
    annualSupport: 30_000,
    years: 10,
    mortgage: 0,
    savings: 5000,
  };
  const chart = capturedBreakdown(p);
  assert.deepEqual(
    chart.needs.map((item) => [item.label, item.amount]),
    [
      ["Family support", 300_000],
      ["Mortgage", 0],
    ],
  );
  assert.deepEqual(
    chart.resources.map((item) => [item.label, item.amount]),
    [["Allocated savings", 5000]],
  );
});
test("coverage highlight appears only for the currently confirmed revision", () => {
  const state = {
    profile: { ...exampleProfile },
    revision: 3,
    confirmedRevision: 3,
  };
  assert.equal(
    getHighlights(state).find((item) => item.key === "estimate")?.value,
    "$700,000",
  );
  assert.equal(
    getHighlights({ ...state, revision: 4 }).some(
      (item) => item.key === "estimate",
    ),
    false,
  );
});
