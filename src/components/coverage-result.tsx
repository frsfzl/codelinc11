"use client";
import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  Lightbulb,
  SlidersHorizontal,
} from "lucide-react";
import {
  calculateNeeds,
  calculateScenario,
  currency,
  type Profile,
  type Scenario,
} from "@/lib/needs";

export function CoverageResult({
  profile,
  example,
  onLearn,
  onScenario,
  externalScenario,
}: {
  profile: Profile;
  example: boolean;
  onLearn: () => void;
  onScenario: (scenario: Scenario) => void;
  externalScenario: Scenario;
}) {
  const result = calculateNeeds(profile);
  const [preferredYears, setYears] = useState(Math.min(profile.years!, 10));
  const scenario = externalScenario.excludeEmployer
    ? "employer"
    : externalScenario.years !== undefined
      ? "years"
      : "original";
  const years = externalScenario.years ?? preferredYears;
  const chosen: Scenario = externalScenario;
  const comparison = calculateScenario(profile, chosen);
  const delta = comparison.additional - result.additional;
  function select(value: typeof scenario) {
    onScenario(
      value === "years"
        ? { years }
        : value === "employer"
          ? { excludeEmployer: true }
          : {},
    );
  }
  return (
    <section className="result-card" aria-labelledby="result-title">
      <div className="result-heading">
        <span className="result-check">
          <Check size={16} />
        </span>
        <span>
          {example ? "FICTIONAL EXAMPLE · " : ""}YOUR PLANNING ESTIMATE
        </span>
      </div>
      <h2 id="result-title">A clearer picture of your needs.</h2>
      <div className="result-amount">{currency(result.additional)}</div>
      <div className="result-amount-label">
        Estimated additional life insurance coverage
      </div>
      <p>
        {result.additional === 0
          ? "The resources you entered meet the needs in this simplified estimate. Review policy terms and changes in your family’s plans before making decisions."
          : `This is the gap between ${currency(result.totalNeeds)} in needs and ${currency(result.totalResources)} in coverage and savings you chose to count.`}
      </p>
      <div className="math-equation">
        <div>
          <span>Total needs</span>
          <strong>{currency(result.totalNeeds)}</strong>
        </div>
        <span>−</span>
        <div>
          <span>Already in place</span>
          <strong>{currency(result.totalResources)}</strong>
        </div>
        <span>=</span>
        <div>
          <span>Additional coverage</span>
          <strong>{currency(result.additional)}</strong>
        </div>
      </div>
      <details className="math-details" open>
        <summary>
          <span>
            <Calculator size={17} />
            How we calculated this
          </span>
          <ChevronDown size={16} />
        </summary>
        <div className="math-content">
          <h3>What you want to provide</h3>
          {result.needs.map((item) => (
            <div className="math-row" key={item.label}>
              <div>
                <span>{item.label}</span>
                {item.detail && <small>{item.detail}</small>}
              </div>
              <strong>{currency(item.amount)}</strong>
            </div>
          ))}
          <div className="math-row math-total">
            <span>Total needs</span>
            <strong>{currency(result.totalNeeds)}</strong>
          </div>
          <h3>What’s already in place</h3>
          {result.resources.map((item) => (
            <div className="math-row" key={item.label}>
              <span>{item.label}</span>
              <strong>− {currency(item.amount)}</strong>
            </div>
          ))}
          <div className="math-row math-total">
            <span>Estimated additional coverage</span>
            <strong>{currency(result.additional)}</strong>
          </div>
          <p className="math-floor">
            Total needs − resources, with a minimum of $0.
          </p>
          <details className="assumptions">
            <summary>Assumptions behind this estimate</summary>
            <ul>
              {result.assumptions.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </details>
        </div>
      </details>
      <div className="scenario-section">
        <h3>
          <SlidersHorizontal size={17} /> What if life looks a little different?
        </h3>
        <p>
          Explore one change at a time. Your original numbers stay the same.
        </p>
        <div
          className="scenario-tabs"
          role="group"
          aria-label="Scenario selection"
        >
          <button
            className={scenario === "original" ? "selected" : ""}
            aria-pressed={scenario === "original"}
            onClick={() => select("original")}
          >
            Original estimate
          </button>
          <button
            className={scenario === "years" ? "selected" : ""}
            aria-pressed={scenario === "years"}
            onClick={() => select("years")}
          >
            Change support period
          </button>
          <button
            className={scenario === "employer" ? "selected" : ""}
            aria-pressed={scenario === "employer"}
            onClick={() => select("employer")}
          >
            Without employer coverage
          </button>
        </div>
        {scenario === "years" && (
          <label className="range-label">
            Support for <strong>{years} years</strong>
            <input
              aria-label="Scenario support years"
              type="range"
              min={1}
              max={60}
              value={years}
              onChange={(e) => {
                const n = Number(e.target.value);
                setYears(n);
                onScenario({ years: n });
              }}
            />
          </label>
        )}
        {scenario !== "original" && (
          <div className="scenario-result" aria-live="polite">
            <div>
              <span>
                {scenario === "years"
                  ? `${years} years of family support`
                  : "If employer coverage is unavailable"}
              </span>
              <strong>{currency(comparison.additional)}</strong>
            </div>
            <p>
              {delta === 0
                ? "The estimated gap stays the same."
                : `${currency(Math.abs(delta))} ${delta < 0 ? "less" : "more"} than the original estimate.`}{" "}
              {scenario === "employer"
                ? "This is a hypothetical. Check your policy’s continuation or conversion options."
                : `Only the support period changes from ${profile.years} to ${years} years.`}
            </p>
          </div>
        )}
      </div>
      <button className="education-link" onClick={onLearn}>
        <span>
          <Lightbulb size={18} />
          Where do term and whole life fit?
        </span>
        <ArrowRight size={17} />
      </button>
      <p className="estimate-note">
        A planning starting point, not a policy quote or a guarantee of
        eligibility.
      </p>
    </section>
  );
}
