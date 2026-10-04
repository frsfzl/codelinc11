"use client";
import { useState } from "react";
import { Check, Info, RotateCcw } from "lucide-react";
import {
  calculateScenario,
  currency,
  type Estimate,
  type LineItem,
  type ProfileState,
  type Scenario,
} from "@/lib/needs";
import {
  buildSummary,
  personalTradeoffs,
  policyComparison,
} from "@/lib/summary";
import type { HighlightKey } from "@/lib/highlights";
import { PolicyTimeline } from "./policy-timeline";

const needColors: Record<string, string> = {
  "Family support": "#780032",
  Mortgage: "#f4510b",
  Education: "#6286ae",
  "Other debts": "#a06c9c",
  "Final expenses": "#377e79",
  "Other goals": "#bb8733",
};
const percentage = (share: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(share * 100)}%`;

function ExcludedAmounts({ items }: { items: LineItem[] }) {
  const excluded = items.filter((item) => item.amount === 0);
  return excluded.length ? (
    <p className="chart-exclusions">
      <strong>Excluded from this estimate:</strong>{" "}
      {excluded.map((item) => item.label.toLowerCase()).join(", ")} ($0).
    </p>
  ) : null;
}

function NeedsDonut({
  items,
  confirmed,
}: {
  items: LineItem[];
  confirmed: boolean;
}) {
  const positive = items.filter((item) => item.amount > 0);
  const total = positive.reduce((sum, item) => sum + item.amount, 0);
  const segments = positive.map((item, index) => ({
    ...item,
    share: item.amount / total,
    offset:
      positive
        .slice(0, index)
        .reduce((sum, previous) => sum + previous.amount, 0) / total,
    color: needColors[item.label] ?? "#6286ae",
  }));
  return (
    <section className="planning-chart needs-donut-chart">
      <h3>Needs &amp; goals</h3>
      <p className="chart-subtitle">
        How your {confirmed ? "total" : "captured"} needs break down.
      </p>
      <div className="needs-donut">
        <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false">
          <circle
            cx="120"
            cy="120"
            r="96"
            fill="none"
            stroke="#edf1f7"
            strokeWidth="28"
          />
          <g transform="rotate(-90 120 120)">
            {segments.map((item) => (
              <circle
                key={item.label}
                cx="120"
                cy="120"
                r="96"
                fill="none"
                stroke={item.color}
                strokeWidth="28"
                pathLength="100"
                strokeDasharray={`${item.share * 100} ${100 - item.share * 100}`}
                strokeDashoffset={-item.offset * 100}
              />
            ))}
          </g>
        </svg>
        <div className="donut-center">
          <strong>{items.length ? currency(total) : "Not yet known"}</strong>
          <span>{confirmed ? "Total needs" : "Captured needs"}</span>
        </div>
      </div>
      {positive.length ? (
        <ul className="chart-legend needs-legend">
          {segments.map((item) => (
            <li key={item.label}>
              <span
                className="chart-swatch"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <div className="chart-legend-copy">
                <div>
                  <span>{item.label}</span>
                  <strong>{currency(item.amount)}</strong>
                </div>
                <small>
                  {percentage(item.share)} of {confirmed ? "total" : "captured"}{" "}
                  needs
                </small>
                {item.detail && <small>{item.detail}</small>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="chart-empty">
          {items.length
            ? "No positive amounts included yet."
            : "Your breakdown will appear as you share your needs."}
        </p>
      )}
      <ExcludedAmounts items={items} />
    </section>
  );
}

function CoverageStack({
  items,
  estimate,
}: {
  items: LineItem[];
  estimate: Estimate | null;
}) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const share =
    estimate && estimate.totalNeeds > 0
      ? Math.min(1, estimate.totalResources / estimate.totalNeeds)
      : null;
  const excess = estimate
    ? Math.max(0, estimate.totalResources - estimate.totalNeeds)
    : 0;
  return (
    <section className="planning-chart resources">
      <h3>Coverage &amp; allocated savings</h3>
      <p className="chart-subtitle">
        What is in place, and what is left to cover.
      </p>
      {share !== null && estimate ? (
        <>
          <div className="coverage-chart-total">
            <strong>{percentage(share)}</strong>
            <span>of your needs accounted for</span>
            <small>
              {currency(Math.min(total, estimate.totalNeeds))} of{" "}
              {currency(estimate.totalNeeds)}
            </small>
          </div>
          <div className="coverage-stack" aria-hidden="true">
            <span
              className="coverage-stack-existing"
              style={{ width: `${share * 100}%` }}
            />
            <span
              className="coverage-stack-gap"
              style={{ width: `${(1 - share) * 100}%` }}
            />
          </div>
          <ul className="chart-legend coverage-legend">
            <li>
              <span
                className="chart-swatch coverage-stack-existing"
                aria-hidden="true"
              />
              <div className="chart-legend-copy">
                <div>
                  <span>
                    Existing resources{excess > 0 ? " applied to needs" : ""}
                  </span>
                  <strong>
                    {currency(Math.min(total, estimate.totalNeeds))}
                  </strong>
                </div>
                <small>{percentage(share)} of total needs</small>
              </div>
            </li>
            <li>
              <span
                className="chart-swatch coverage-stack-gap"
                aria-hidden="true"
              />
              <div className="chart-legend-copy">
                <div>
                  <span>Additional coverage needed</span>
                  <strong>{currency(estimate.additional)}</strong>
                </div>
                <small>{percentage(1 - share)} of total needs</small>
              </div>
            </li>
          </ul>
        </>
      ) : (
        <div className="coverage-chart-total">
          <strong>{items.length ? currency(total) : "Not yet known"}</strong>
          <span>{estimate ? "Existing resources" : "Captured resources"}</span>
          <small>
            {estimate
              ? "No additional coverage is indicated by these inputs."
              : "Confirm your complete picture to see the remaining gap."}
          </small>
        </div>
      )}
      {excess > 0 && (
        <p className="chart-excess">
          Resources exceed estimated needs by {currency(excess)}. Additional
          coverage has a minimum of $0.
        </p>
      )}
      <div className="resource-breakdown">
        <h4>Your existing resources</h4>
        {items
          .filter((item) => item.amount > 0)
          .map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{currency(item.amount)}</strong>
            </div>
          ))}
        {!items.length && (
          <p className="chart-empty">No amounts captured yet.</p>
        )}
        <ExcludedAmounts items={items} />
      </div>
    </section>
  );
}

export function UnknownDetails({ state }: { state: ProfileState }) {
  const summary = buildSummary(state);
  if (!summary.unknowns.length) return null;
  return (
    <section className="planning-unknowns">
      <h3>
        <Info size={16} /> Still to clarify
      </h3>
      <ul>
        {summary.unknowns.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Unknown amounts are not treated as zero.</p>
    </section>
  );
}

export function NumbersPanel({
  state,
  focus,
  onContinue,
}: {
  state: ProfileState;
  focus?: HighlightKey;
  onContinue?: () => void;
}) {
  const summary = buildSummary(state);
  const result = summary.estimate;
  return (
    <div className="planning-panel">
      <div className="planning-section-heading">
        <h2>
          {focus === "resources"
            ? "What is already in place"
            : "Your coverage, explained"}
        </h2>
        <span
          className={`review-status ${summary.confirmed ? "confirmed" : ""}`}
        >
          {summary.confirmed && <Check size={13} />}
          {summary.status}
        </span>
      </div>
      {result ? (
        <div
          className="coverage-equation"
          aria-label={`${currency(result.totalNeeds)} of needs minus ${currency(result.totalResources)} of resources equals ${currency(result.additional)} additional coverage, with a minimum of zero.`}
        >
          <div>
            <small>Total needs</small>
            <strong>{currency(result.totalNeeds)}</strong>
          </div>
          <span aria-hidden="true">−</span>
          <div>
            <small>Existing resources</small>
            <strong>{currency(result.totalResources)}</strong>
          </div>
          <span aria-hidden="true">=</span>
          <div className="equation-result">
            <small>Additional coverage</small>
            <strong>{currency(result.additional)}</strong>
          </div>
        </div>
      ) : (
        <div className="planning-notice">
          <p>
            {summary.status === "Incomplete"
              ? "Here is what we have so far. A final estimate needs the remaining details."
              : "Your numbers have changed or are awaiting review. Confirm the latest recap with Linc before calculating."}
          </p>
          {onContinue && (
            <button className="text-link" onClick={onContinue}>
              Continue with Linc
            </button>
          )}
        </div>
      )}
      <div
        className={`numbers-grid ${focus === "resources" ? "resources-first" : ""}`}
      >
        <NeedsDonut items={summary.needs} confirmed={summary.confirmed} />
        <CoverageStack items={summary.resources} estimate={result} />
      </div>
      {state.profile.annualSupport !== null && state.profile.years === null && (
        <p className="chart-note">
          {currency(state.profile.annualSupport)}/year in family support.
          Duration still needed.
        </p>
      )}
      <UnknownDetails state={state} />
      <p className="chart-note">
        Additional coverage has a minimum of $0. Inflation, investment returns,
        taxes, and future changes are not modeled. Confirm that family support
        excludes debts and goals counted separately.
      </p>
    </div>
  );
}

export function PolicyPanel({ state }: { state: ProfileState }) {
  return (
    <div className="planning-panel">
      <h2>Term and whole life, side by side.</h2>
      <p className="planning-intro">
        The amount you need and the type of policy are separate decisions.
      </p>
      <PolicyTimeline supportYears={state.profile.years} />
      <div className="policy-table-wrap">
        <table className="policy-table">
          <thead>
            <tr>
              <th scope="col">Compare</th>
              <th scope="col">Term life</th>
              <th scope="col">Whole life</th>
            </tr>
          </thead>
          <tbody>
            {policyComparison.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.term}</td>
                <td>{row.whole}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="planning-section-heading">
        <h2>What this means for you</h2>
      </div>
      <div className="personal-tradeoffs">
        {personalTradeoffs(state).map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ScenarioPanel({
  state,
  scenario,
  onScenario,
  onContinue,
}: {
  state: ProfileState;
  scenario: Scenario;
  onScenario: (next: Scenario) => void;
  onContinue: () => void;
}) {
  const summary = buildSummary(state);
  const baseline = summary.estimate;
  const [choice, setChoice] = useState<"years" | "employer">(
    scenario.excludeEmployer ? "employer" : "years",
  );
  if (!baseline)
    return (
      <div className="planning-panel">
        <h2>Start with a confirmed picture.</h2>
        <p className="planning-intro">
          Linc needs your confirmed numbers before comparing alternatives.
          Unknown amounts will stay unknown.
        </p>
        <button className="btn btn-primary" onClick={onContinue}>
          Continue with Linc
        </button>
      </div>
    );
  const alternative = calculateScenario(state.profile, scenario);
  const delta = alternative.additional - baseline.additional;
  const max = Math.max(baseline.additional, alternative.additional, 1);
  return (
    <div className="planning-panel">
      <h2>Change one thing. See what it means.</h2>
      <p className="planning-intro">
        These are hypothetical comparisons. Your confirmed details stay the
        same.
      </p>
      <div
        className="scenario-choice"
        role="group"
        aria-label="What to explore"
      >
        <button
          aria-pressed={choice === "years"}
          onClick={() => {
            setChoice("years");
            onScenario({});
          }}
        >
          Support duration
        </button>
        <button
          aria-pressed={choice === "employer"}
          onClick={() => {
            setChoice("employer");
            onScenario({ excludeEmployer: true });
          }}
        >
          Without employer coverage
        </button>
      </div>
      {choice === "years" ? (
        <label className="scenario-slider">
          Family support for{" "}
          <strong>{scenario.years ?? state.profile.years} years</strong>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={scenario.years ?? state.profile.years ?? 1}
            onChange={(event) =>
              onScenario({ years: Number(event.target.value) })
            }
          />
          <span>
            1 year <span>60 years</span>
          </span>
        </label>
      ) : (
        <p className="planning-notice">
          Explore removing {currency(state.profile.employerCoverage!)} in
          employer coverage. Actual continuation terms need separate review.
        </p>
      )}
      <div className="scenario-comparison" aria-live="polite">
        {[
          { label: "Your confirmed estimate", amount: baseline.additional },
          { label: "Hypothetical estimate", amount: alternative.additional },
        ].map((row) => (
          <div key={row.label}>
            <div>
              <span>{row.label}</span>
              <strong>{currency(row.amount)}</strong>
            </div>
            <div className="scenario-bar" aria-hidden="true">
              <span style={{ width: `${(row.amount / max) * 100}%` }} />
            </div>
          </div>
        ))}
        <p className="scenario-difference">
          {delta === 0
            ? "No change to additional coverage"
            : `${currency(Math.abs(delta))} ${delta > 0 ? "more" : "less"} additional coverage`}
        </p>
        <p className="chart-note">
          {scenario.excludeEmployer
            ? `Needs stay at ${currency(baseline.totalNeeds)}. Resources become ${currency(alternative.totalResources)}.`
            : `${currency(state.profile.annualSupport!)} annual support × ${scenario.years ?? state.profile.years} years. Other goals and resources stay the same.`}
        </p>
      </div>
      <div className="planning-actions">
        <button
          className="text-link"
          onClick={() => {
            setChoice("years");
            onScenario({});
          }}
        >
          <RotateCcw size={14} /> Reset comparison
        </button>
        <button className="text-link" onClick={onContinue}>
          Discuss this with Linc
        </button>
      </div>
    </div>
  );
}
