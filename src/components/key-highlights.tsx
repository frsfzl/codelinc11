"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  LoaderCircle,
  ChartNoAxesCombined,
  HeartHandshake,
  House,
  Landmark,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  getHighlights,
  type Highlight,
  type HighlightKey,
} from "@/lib/highlights";
import type { Profile, ProfileState } from "@/lib/needs";

const icons = {
  people: HeartHandshake,
  support: Wallet,
  goals: House,
  resources: Landmark,
  estimate: ChartNoAxesCombined,
};

const detailFields: Record<
  Exclude<HighlightKey, "estimate">,
  (keyof Profile)[]
> = {
  people: ["dependents", "priorities"],
  support: ["income", "annualSupport", "years", "budget"],
  goals: ["mortgage", "debts", "education", "finalExpenses", "otherNeeds"],
  resources: ["employerCoverage", "personalCoverage", "savings"],
};

function HighlightCard({
  item,
  signature,
  index,
  onOpen,
}: {
  item: Highlight;
  signature: string;
  index: number;
  onOpen: (key: HighlightKey) => void;
}) {
  const previous = useRef(signature);
  const [change, setChange] = useState<"added" | "updated" | null>("added");
  const [burst, setBurst] = useState(0);
  const Icon = icons[item.key];

  useEffect(() => {
    if (previous.current !== signature) {
      previous.current = signature;
      setChange("updated");
      setBurst((value) => value + 1);
    }
    const timer = setTimeout(() => setChange(null), 2800);
    return () => clearTimeout(timer);
  }, [signature]);

  return (
    <button
      type="button"
      className={`highlight-card highlight-${item.key}`}
      data-change={change ?? undefined}
      style={
        { "--highlight-delay": `${Math.min(index, 4) * 70}ms` } as CSSProperties
      }
      onClick={() => onOpen(item.key)}
      aria-label={`Explore ${item.title.toLowerCase()}`}
    >
      {change && (
        <span key={burst} className="highlight-feedback" aria-hidden="true">
          <span className="highlight-glow" />
          <span className="highlight-sweep" />
        </span>
      )}
      <div className="highlight-top">
        <span key={burst} className="highlight-symbol" aria-hidden="true">
          <Icon size={16} />
        </span>
        <span className="highlight-title">{item.title}</span>
        {change && (
          <span
            key={`badge-${burst}`}
            className="highlight-change"
            aria-hidden="true"
          >
            <Check size={10} strokeWidth={2.5} />
            {change === "added" ? "Added" : "Updated"}
          </span>
        )}
      </div>
      <div className="highlight-value" key={signature}>
        <strong>{item.value}</strong>
        <small>{item.detail}</small>
        {item.pending?.map((note) => (
          <span className="highlight-unknown" key={note}>
            {note}
          </span>
        ))}
      </div>
    </button>
  );
}

export function KeyHighlights({
  state,
  example,
  onOpen,
  processing = false,
}: {
  state: ProfileState;
  example: boolean;
  onOpen: (key: HighlightKey) => void;
  processing?: boolean;
}) {
  const highlights = getHighlights(state);
  const previousRevision = useRef(state.revision);
  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    if (previousRevision.current === state.revision) return;
    previousRevision.current = state.revision;
    setUpdated(true);
    const timer = setTimeout(() => setUpdated(false), 2200);
    return () => clearTimeout(timer);
  }, [state.revision]);
  return (
    <div
      className="key-highlights"
      role="region"
      aria-label="Captured key details"
      aria-busy={processing}
      tabIndex={0}
    >
      <div className="highlight-progress" role="status" aria-live="polite">
        {processing ? (
          <>
            <LoaderCircle size={14} className="spin" /> Updating key details…
          </>
        ) : updated ? (
          <>
            <Check size={14} /> Key details updated
          </>
        ) : null}
      </div>
      {example && <span className="example-badge">FICTIONAL EXAMPLE</span>}
      {highlights.length ? (
        <div className="highlight-list">
          {highlights.map((item, index) => (
            <HighlightCard
              key={item.key}
              item={item}
              index={index}
              signature={JSON.stringify(
                item.key === "estimate"
                  ? [item.value, item.detail, state.confirmedRevision]
                  : [
                      detailFields[item.key].map(
                        (field) => state.profile[field],
                      ),
                      item.pending,
                    ],
              )}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <div className="highlights-empty">
          <Sparkles size={21} strokeWidth={1.4} />
          <p>Key details will appear here as you share them.</p>
        </div>
      )}
    </div>
  );
}
