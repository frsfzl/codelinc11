"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, X } from "lucide-react";
import { buildSummary, policyComparison } from "@/lib/summary";
import type { ProfileState } from "@/lib/needs";
import { NumbersPanel } from "./planning-panels";
import { PolicyTimeline } from "./policy-timeline";

export function SummaryReport({
  state,
  onClose,
}: {
  state: ProfileState;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const summary = buildSummary(state);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function download() {
    setDownloading(true);
    setError("");
    try {
      const { createSummaryPdf } = await import("@/lib/summary-pdf");
      const response = await fetch("/brand/lincoln-financial.png");
      if (!response.ok) throw new Error("Logo unavailable");
      const pdf = await createSummaryPdf(
        state,
        new Uint8Array(await response.arrayBuffer()),
      );
      pdf.save(`Linc-coverage-summary-r${state.revision}.pdf`);
    } catch {
      setError(
        "The PDF could not be created. Your summary is still here. Please try again.",
      );
    } finally {
      setDownloading(false);
    }
  }
  return (
    <dialog
      className="insight-view planning-dialog report-dialog"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="report-title"
    >
      <header className="insight-header">
        <button className="text-link" onClick={onClose}>
          Back to Linc
        </button>
        <span>YOUR TAKEAWAY</span>
        <button
          className="insight-close"
          onClick={onClose}
          aria-label="Close summary"
        >
          <X size={18} />
        </button>
      </header>
      <div className="planning-body">
        <div className="report-heading">
          <Image
            src="/brand/lincoln-financial.png"
            alt="Lincoln Financial"
            width={154}
            height={71}
          />
          <span
            className={`review-status ${summary.confirmed ? "confirmed" : ""}`}
          >
            {summary.status}
          </span>
        </div>
        <div className="planning-title">
          <h1 id="report-title">Your coverage summary.</h1>
          <p>
            {summary.confirmed
              ? "A clearer picture of the people, goals, and choices you discussed."
              : "Your progress so far. Clarify and confirm the remaining details with Linc."}
          </p>
        </div>
        <section className="report-context">
          <div>
            <span>WHO YOU WANT TO PROTECT</span>
            <p>{state.profile.dependents || "Still to discuss"}</p>
          </div>
          <div>
            <span>WHAT MATTERS TO YOU</span>
            <p>
              {state.profile.priorities ||
                "Your priorities are still to discuss."}
            </p>
          </div>
        </section>
        <NumbersPanel state={state} onContinue={onClose} />
        <section className="planning-panel">
          <h2>Your options</h2>
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
          <div className="personal-tradeoffs">
            {summary.tradeoffs.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="report-notes">
          <div>
            <h2>Assumptions to keep in mind</h2>
            <ul>
              {summary.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Your next steps</h2>
            <ol>
              {summary.nextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </section>
        <footer className="insight-footer">
          <p>
            Educational planning summary, not a policy quote or guarantee.
            Updated from your current details, revision {state.revision}.
          </p>
          <a
            href="https://content.naic.org/consumer/life-insurance.htm"
            target="_blank"
            rel="noreferrer"
          >
            NAIC consumer guide
          </a>
        </footer>
      </div>
      <div className="report-actions">
        {error && <p role="alert">{error}</p>}
        <button className="btn btn-secondary" onClick={onClose}>
          Back to Linc
        </button>
        <button
          className="btn btn-primary"
          disabled={downloading}
          onClick={() => void download()}
        >
          {downloading ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Download size={16} />
          )}{" "}
          {downloading ? "Creating PDF…" : "Download PDF"}
        </button>
      </div>
    </dialog>
  );
}
