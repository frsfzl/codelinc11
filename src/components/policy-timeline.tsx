"use client";
import { useId, useState } from "react";

const illustrativeTerms = [10, 15, 20, 30];

export function PolicyTimeline({
  supportYears,
}: {
  supportYears: number | null;
}) {
  const id = useId();
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const termYears =
    selectedTerm ??
    (supportYears === null
      ? 20
      : (illustrativeTerms.find((years) => years >= supportYears) ?? 30));
  const horizon = Math.max(40, Math.ceil((supportYears ?? 0) / 20) * 20);
  const ticks = [0, horizon / 4, horizon / 2, (horizon * 3) / 4, horizon];
  const difference = supportYears === null ? null : termYears - supportYears;
  const takeaway =
    difference === null
      ? "Share your support timeline with Linc to compare it with these options."
      : difference === 0
        ? `This illustrative term matches your ${supportYears}-year support goal.`
        : `This illustrative term ${difference < 0 ? "ends" : "extends"} ${Math.abs(difference)} ${Math.abs(difference) === 1 ? "year" : "years"} ${difference < 0 ? "before" : "beyond"} your support goal.`;

  return (
    <figure className="policy-timeline" aria-labelledby={`${id}-title`}>
      <div className="policy-timeline-heading">
        <h3 id={`${id}-title`}>How long would protection last?</h3>
        <label className="policy-term-control" htmlFor={`${id}-term`}>
          Illustrative term
          <select
            id={`${id}-term`}
            value={termYears}
            onChange={(event) => setSelectedTerm(Number(event.target.value))}
            aria-describedby={`${id}-note`}
          >
            {illustrativeTerms.map((years) => (
              <option key={years} value={years}>
                {years} years
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="policy-timeline-lanes">
        <div className="policy-timeline-lane">
          <div className="policy-lane-label">
            <strong>Your family support goal</strong>
            <span>
              {supportYears === null
                ? "Still to discuss"
                : `${supportYears} years`}
            </span>
          </div>
          <div
            className="policy-lane-track policy-goal-track"
            aria-hidden="true"
          >
            <span
              className="policy-goal-bar"
              style={{ width: `${((supportYears ?? 0) / horizon) * 100}%` }}
            />
          </div>
        </div>
        <div className="policy-timeline-lane">
          <div className="policy-lane-label">
            <strong>Term life</strong>
            <span>Selected term ends in year {termYears}</span>
          </div>
          <div className="policy-lane-track" aria-hidden="true">
            <span
              className="policy-term-bar"
              style={{ width: `${(termYears / horizon) * 100}%` }}
            />
          </div>
        </div>
        <div className="policy-timeline-lane">
          <div className="policy-lane-label">
            <strong>Whole life</strong>
            <span>Designed for lifelong coverage*</span>
          </div>
          <div className="policy-lane-track" aria-hidden="true">
            <span className="policy-whole-bar" />
          </div>
        </div>
        <div className="policy-timeline-axis" aria-hidden="true">
          {ticks.map((year) => (
            <span key={year} style={{ left: `${(year / horizon) * 100}%` }}>
              {year === 0 ? "Now" : year === horizon ? `${year}+` : year}
            </span>
          ))}
        </div>
        <p className="policy-timeline-axis-title">Years from now</p>
      </div>
      <p
        className="policy-timeline-takeaway"
        aria-live="polite"
        aria-atomic="true"
      >
        {takeaway}
      </p>
      <figcaption id={`${id}-note`}>
        *Coverage depends on premiums and policy conditions. Durations are
        illustrative, not policy offers. Changing this comparison does not
        change your support goal or coverage estimate.
      </figcaption>
    </figure>
  );
}
