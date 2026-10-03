"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Infinity as InfinityIcon,
  Pencil,
  Scale,
} from "lucide-react";
import {
  calculateNeeds,
  currency,
  missingFields,
  type LineItem,
  type ProfileState,
} from "@/lib/needs";
import {
  capturedBreakdown,
  getHighlights,
  type HighlightKey,
} from "@/lib/highlights";

const headings: Record<HighlightKey, string> = {
  people: "The people behind your plan.",
  support: "Everyday life, accounted for.",
  goals: "Make room for the bigger things.",
  resources: "See what’s already in place.",
  estimate: "Your coverage, in perspective.",
};

export function InsightView({
  state,
  initialFocus,
  example,
  onClose,
  onEdit,
}: {
  state: ProfileState;
  initialFocus: HighlightKey;
  example: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [focus, setFocus] = useState(initialFocus);
  const [policy, setPolicy] = useState<"term" | "whole">("term");
  const p = state.profile;
  const confirmed = state.confirmedRevision === state.revision;
  const result = confirmed ? calculateNeeds(p) : null;
  const breakdown = result ?? capturedBreakdown(p);
  const highlights = getHighlights(state);
  const selected = highlights.find((item) => item.key === focus);
  const term = policy === "term";
  const amountMax = Math.max(
    1,
    ...breakdown.needs.map((item) => item.amount),
    ...breakdown.resources.map((item) => item.amount),
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      className="insight-view"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="insight-title"
    >
      <header className="insight-header">
        <button className="text-link" onClick={onEdit}>
          <Pencil size={14} />
          Edit inputs
        </button>
        <span>{example ? "FICTIONAL EXAMPLE" : "YOUR PERSONAL OVERVIEW"}</span>
        <button
          className="insight-close"
          onClick={onClose}
          aria-label="Close comparison"
        >
          <X size={18} />
        </button>
      </header>
      <div className="insight-body">
        <div className="insight-heading">
          <div>
            <div className="eyebrow">THE BIGGER PICTURE</div>
            <h1 id="insight-title">{headings[focus]}</h1>
            <p>
              {selected?.detail ||
                "Explore your captured details and the choices ahead."}
            </p>
          </div>
          <span className={`review-status ${confirmed ? "confirmed" : ""}`}>
            {confirmed && <Check size={13} />}
            {confirmed ? "Inputs reviewed" : "Inputs awaiting review"}
          </span>
        </div>
        <nav className="insight-nav" aria-label="Captured highlights">
          {highlights.map((item) => (
            <button
              key={item.key}
              className={focus === item.key ? "selected" : ""}
              aria-pressed={focus === item.key}
              onClick={() => setFocus(item.key)}
            >
              {item.title}
            </button>
          ))}
        </nav>
        {focus === "people" && (
          <div className="people-context">
            {p.dependents && (
              <div>
                <span>WHO MATTERS TO YOU</span>
                <p>{p.dependents}</p>
              </div>
            )}
            {p.priorities && (
              <div>
                <span>WHAT MATTERS MOST</span>
                <p>{p.priorities}</p>
              </div>
            )}
          </div>
        )}
        {result ? (
          <div className="insight-metrics">
            <div>
              <span>Total needs</span>
              <strong>{currency(result.totalNeeds)}</strong>
            </div>
            <div>
              <span>Coverage & allocated savings</span>
              <strong>{currency(result.totalResources)}</strong>
            </div>
            <div className="metric-emphasis">
              <span>Estimated additional coverage</span>
              <strong>{currency(result.additional)}</strong>
            </div>
          </div>
        ) : (
          <div className="insight-pending">
            <div>
              <strong>A picture in progress.</strong>
              <p>
                {missingFields(p).length
                  ? "These charts show only captured inputs. Missing details are not counted as zero."
                  : "Your inputs are ready to check. Confirm them to see your coverage estimate."}
              </p>
            </div>
            <button className="text-link" onClick={onEdit}>
              Review my numbers <ArrowRight size={14} />
            </button>
          </div>
        )}
        <div className="insight-visuals">
          <section
            className="insight-chart-card"
            aria-labelledby="breakdown-title"
          >
            <div className="insight-card-heading">
              <div>
                <span className="eyebrow">
                  {confirmed ? "THE NUMBERS YOU CONFIRMED" : "CAPTURED SO FAR"}
                </span>
                <h2 id="breakdown-title">
                  {focus === "resources"
                    ? "What you can count toward it"
                    : "Where the numbers come from"}
                </h2>
              </div>
              <span>USD</span>
            </div>
            {focus === "resources" ? (
              <>
                <AmountChart
                  title="Coverage & allocated savings"
                  items={breakdown.resources}
                  max={amountMax}
                  variant="resources"
                />
                <AmountChart
                  title="Needs & goals"
                  items={breakdown.needs}
                  max={amountMax}
                />
              </>
            ) : (
              <>
                <AmountChart
                  title="Needs & goals"
                  items={breakdown.needs}
                  max={amountMax}
                />
                <AmountChart
                  title="Coverage & allocated savings"
                  items={breakdown.resources}
                  max={amountMax}
                  variant="resources"
                />
              </>
            )}
            {p.annualSupport !== null && p.years === null && (
              <p className="chart-note">
                {currency(p.annualSupport)} a year captured for support. Add a
                support period to show its total.
              </p>
            )}
            <p className="chart-note">
              {confirmed
                ? "Needs minus resources, with a minimum gap of $0. Inflation, returns, and taxes are not modeled."
                : "This is not a final estimate. Review and confirm your entries before calculating a coverage gap."}
            </p>
          </section>
          <section
            className="policy-explorer"
            aria-labelledby="policy-explorer-title"
          >
            <div className="eyebrow">EXPLORE YOUR OPTIONS</div>
            <h2 id="policy-explorer-title">
              Two ways to think about protection.
            </h2>
            <div
              className="policy-toggle"
              role="group"
              aria-label="Policy type"
            >
              <button
                aria-pressed={term}
                className={term ? "selected" : ""}
                onClick={() => setPolicy("term")}
              >
                <Clock3 size={16} />
                Term life
              </button>
              <button
                aria-pressed={!term}
                className={!term ? "selected" : ""}
                onClick={() => setPolicy("whole")}
              >
                <InfinityIcon size={17} />
                Whole life
              </button>
            </div>
            <div className="policy-duration" aria-live="polite">
              <h3>
                {term
                  ? "Protection for a chosen period"
                  : "Designed for lifelong protection"}
              </h3>
              <p>
                {term
                  ? "Coverage runs for the term you select, subject to the policy’s conditions."
                  : "Coverage can continue for life when required premiums and policy conditions are met."}
              </p>
              <div
                className={`duration-diagram ${term ? "term" : "whole"}`}
                role="img"
                aria-label={
                  term
                    ? "Conceptual timeline: protection for a selected term, followed by an end to that term."
                    : "Conceptual timeline: protection continuing through later life, subject to policy conditions."
                }
              >
                <div className="duration-axis">
                  <span>Now</span>
                  <span>Later life</span>
                </div>
                <div className="duration-track">
                  <div className="duration-fill">
                    {term ? "Selected term" : "Lifelong protection"}
                    {!term && <ArrowRight size={14} />}
                  </div>
                </div>
                <div className="duration-caption">
                  {term
                    ? "Coverage ends unless renewed or converted under policy terms."
                    : "Maintaining the policy and premiums matters."}
                </div>
              </div>
              <span className="diagram-footnote">
                Conceptual illustration · not to scale
              </span>
            </div>
            <div className="policy-connection">
              <span>IN YOUR PICTURE</span>
              <p>
                {p.years !== null
                  ? `You’ve captured ${p.years} years of family support. ${term ? "A time-bound goal is one reason to explore term coverage. Your support period is not an automatically selected policy term." : "Lifelong care or legacy goals may extend beyond that period. Whole life is one option to explore if ongoing costs fit your plans."}`
                  : "As your goals become clearer, consider whether the need has an end date or may last throughout your life."}
              </p>
              {p.budget !== null && (
                <p>
                  Your {currency(p.budget)}/month budget is a preference, not a
                  premium quote.
                </p>
              )}
            </div>
            <p className="policy-amount-note">
              Changing policy type does not change the needs calculation.
            </p>
          </section>
        </div>
        <section
          className="insight-tradeoffs"
          aria-labelledby="tradeoffs-title"
        >
          <div className="tradeoff-heading">
            <Scale size={20} />
            <div>
              <span className="eyebrow">THE TRADEOFFS</span>
              <h2 id="tradeoffs-title">
                {term
                  ? "Term life: what to weigh"
                  : "Whole life: what to weigh"}
              </h2>
            </div>
          </div>
          <div className="tradeoff-grid">
            <article>
              <span>WHAT IT CAN OFFER</span>
              <h3>
                {term
                  ? "More coverage for an initial budget"
                  : "Continuity for lasting needs"}
              </h3>
              <p>
                {term
                  ? "Usually lower initial premiums than whole life for the same coverage. Often relevant to a mortgage or years of family support."
                  : "Designed for lifelong coverage, with a cash-value component. May be relevant to lasting responsibilities or legacy goals."}
              </p>
            </article>
            <article>
              <span>WHAT TO KEEP IN MIND</span>
              <h3>{term ? "The end of the term" : "The ongoing commitment"}</h3>
              <p>
                {term
                  ? "Generally no cash value. Renewal can cost more; conversion and future coverage depend on actual policy terms."
                  : "Typically higher premiums than term for the same coverage. Loans, withdrawals, and surrender costs can affect value and benefits."}
              </p>
            </article>
            <article>
              <span>YOUR NEXT CONVERSATION</span>
              <h3>
                {term
                  ? "Match the timing to your goals"
                  : "Check the fit over time"}
              </h3>
              <p>
                {term
                  ? "Discuss the duration you need, the cost you can maintain, and what happens when the term ends."
                  : "Discuss long-term affordability, guarantees, cash-value rules, and whether lifelong coverage fits your priorities."}
              </p>
            </article>
          </div>
        </section>
        <footer className="insight-footer">
          <p>
            Educational guidance, not a policy quote. Compare actual policies
            with a licensed professional.
          </p>
          <a
            href="https://content.naic.org/consumer/life-insurance.htm"
            target="_blank"
            rel="noreferrer"
          >
            NAIC consumer guide <ArrowUpRight size={14} />
          </a>
        </footer>
      </div>
    </dialog>
  );
}

function AmountChart({
  title,
  items,
  max,
  variant = "needs",
}: {
  title: string;
  items: LineItem[];
  max: number;
  variant?: "needs" | "resources";
}) {
  const positive = items.filter((item) => item.amount > 0);
  const excluded = items.filter((item) => item.amount === 0);
  return (
    <div className={`amount-chart ${variant}`}>
      <h3>{title}</h3>
      {positive.length ? (
        positive.map((item) => (
          <div className="amount-chart-row" key={item.label}>
            <div className="amount-chart-label">
              <span>{item.label}</span>
              <strong>{currency(item.amount)}</strong>
            </div>
            {item.detail && <small>{item.detail}</small>}
            <div className="amount-chart-track" aria-hidden="true">
              <span style={{ width: `${(item.amount / max) * 100}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p className="chart-empty">
          {items.length
            ? "Captured items in this group are set to $0."
            : "No amounts captured in this group yet."}
        </p>
      )}
      {excluded.length > 0 && (
        <details className="chart-exclusions">
          <summary>{excluded.length} items explicitly set to $0</summary>
          <p>{excluded.map((item) => item.label).join(" · ")}</p>
        </details>
      )}
    </div>
  );
}
