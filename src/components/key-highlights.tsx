"use client";
import { useEffect, useRef, useState } from "react";
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
import { getHighlights, type HighlightKey } from "@/lib/highlights";
import type { ProfileState } from "@/lib/needs";

const icons = {
  people: HeartHandshake,
  support: Wallet,
  goals: House,
  resources: Landmark,
  estimate: ChartNoAxesCombined,
};
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
    <div className="key-highlights" aria-busy={processing}>
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
          {highlights.map((item) => {
            const Icon = icons[item.key];
            return (
              <button
                className={`highlight-card highlight-${item.key}`}
                key={item.key}
                onClick={() => onOpen(item.key)}
                aria-label={`Explore ${item.title.toLowerCase()}`}
              >
                <div className="highlight-top">
                  <Icon size={16} />
                  <span>{item.title}</span>
                </div>
                <div
                  className="highlight-value"
                  key={`${item.value}:${item.detail}`}
                >
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </div>
              </button>
            );
          })}
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
