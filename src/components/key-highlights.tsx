"use client";
import {
  LoaderCircle,
  ChartNoAxesCombined,
  HeartHandshake,
  House,
  Landmark,
  Pencil,
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
  onEdit,
  processing = false,
}: {
  state: ProfileState;
  example: boolean;
  onOpen: (key: HighlightKey) => void;
  onEdit: () => void;
  processing?: boolean;
}) {
  const highlights = getHighlights(state);
  return (
    <div className="key-highlights" aria-busy={processing}>
      {processing ? (
        <p className="highlights-caption highlights-loading" role="status">
          <LoaderCircle size={14} className="spin" />
          Updating key details…
        </p>
      ) : (
        <p className="highlights-caption">The important pieces, as we talk.</p>
      )}
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
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
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
      <button className="highlight-edit" onClick={onEdit}>
        <Pencil size={13} />
        Edit inputs
      </button>
    </div>
  );
}
