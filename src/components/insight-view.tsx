"use client";
import { useEffect, useRef, useState } from "react";
import { X, MessageCircle } from "lucide-react";
import type { ProfileState, Scenario } from "@/lib/needs";
import type { HighlightKey } from "@/lib/highlights";
import { NumbersPanel, PolicyPanel, ScenarioPanel } from "./planning-panels";

export type InsightSection = "numbers" | "options" | "what-if";
export function InsightView({
  state,
  initialFocus,
  initialSection,
  example,
  scenario,
  onScenario,
  onClose,
  onContinue,
}: {
  state: ProfileState;
  initialFocus: HighlightKey;
  initialSection?: InsightSection;
  example: boolean;
  scenario: Scenario;
  onScenario: (scenario: Scenario) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState<InsightSection>(
    initialSection ?? (initialFocus === "people" ? "options" : "numbers"),
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const tabs = [
    { key: "numbers", label: "Your numbers" },
    { key: "options", label: "Your options" },
    { key: "what-if", label: "What if" },
  ] as const;
  return (
    <dialog
      className="insight-view planning-dialog"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="insight-title"
    >
      <header className="insight-header">
        <button className="text-link" onClick={onContinue}>
          <MessageCircle size={15} /> Back to Linc
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
      <div className="planning-body">
        <div className="planning-title">
          <span className="eyebrow">A LITTLE MORE CLARITY</span>
          <h1 id="insight-title">Make sense of your options.</h1>
        </div>
        <nav className="planning-tabs" aria-label="Explore your picture">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              aria-pressed={section === tab.key}
              onClick={() => setSection(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {section === "numbers" && (
          <NumbersPanel
            state={state}
            focus={initialFocus}
            onContinue={onContinue}
          />
        )}
        {section === "options" && <PolicyPanel state={state} />}
        {section === "what-if" && (
          <ScenarioPanel
            state={state}
            scenario={scenario}
            onScenario={onScenario}
            onContinue={onContinue}
          />
        )}
        <footer className="insight-footer">
          <p>Educational guidance. Estimates are not policy quotes.</p>
          <a
            href="https://content.naic.org/consumer/life-insurance.htm"
            target="_blank"
            rel="noreferrer"
          >
            NAIC consumer guide
          </a>
        </footer>
      </div>
    </dialog>
  );
}
