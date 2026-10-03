"use client";
import { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  Clock3,
  Infinity as InfinityIcon,
  X,
} from "lucide-react";
import { currency, type Profile } from "@/lib/needs";
export function Education({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      className="education-dialog"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="education-title"
    >
      <div className="dialog-header">
        <div>
          <div className="eyebrow">UNDERSTAND YOUR OPTIONS</div>
          <h2 id="education-title">Two different ways to protect.</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close education"
        >
          <X size={21} />
        </button>
      </div>
      <div className="dialog-body">
        <p className="form-intro">
          Coverage amount and policy type are separate decisions. Here’s a
          starting point for a more informed conversation.
        </p>
        <div className="education-grid">
          <article>
            <Clock3 size={24} />
            <h3>Term life</h3>
            <span className="policy-label">Protection for a set period</span>
            <ul>
              <li>Covers a specified term if policy conditions are met.</li>
              <li>
                Usually has lower initial premiums than whole life for the same
                coverage.
              </li>
              <li>Generally does not build cash value.</li>
              <li>
                Coverage ends at the end of the term unless renewed or converted
                under the policy’s terms.
              </li>
            </ul>
          </article>
          <article>
            <InfinityIcon size={24} />
            <h3>Whole life</h3>
            <span className="policy-label">
              Designed for lifelong protection
            </span>
            <ul>
              <li>
                Designed to remain in force for life when required premiums and
                conditions are met.
              </li>
              <li>Includes a cash-value component.</li>
              <li>
                Typically has higher premiums than term for the same coverage.
              </li>
              <li>
                Loans, withdrawals, surrender costs, and policy terms can affect
                value and benefits.
              </li>
            </ul>
          </article>
        </div>
        <div className="personal-context">
          <h3>How this connects to your story</h3>
          <p>
            {profile.years !== null
              ? `You’re exploring ${profile.years} years of family support. A need with a defined end date is a reason to explore term coverage. `
              : "If your needs have a defined end date, term coverage may be worth exploring. "}
            Lifelong support for a dependent or a legacy goal may be a reason to
            explore permanent coverage. Your priorities and what you can
            comfortably maintain matter.
          </p>
          {profile.budget !== null && (
            <p>
              You mentioned a budget of {currency(profile.budget)} per month.
              That is a preference, not a quoted premium. Actual costs depend on
              the product, insurer, application, and underwriting.
            </p>
          )}
          <p>
            Neither option is automatically the best fit. A licensed insurance
            professional can help compare actual policies, costs, and
            guarantees.
          </p>
        </div>
        <div className="learning-sources">
          <span>KEEP EXPLORING</span>
          <a
            href="https://content.naic.org/consumer/life-insurance.htm"
            target="_blank"
            rel="noreferrer"
          >
            NAIC consumer guide <ArrowUpRight size={15} />
          </a>
          <a
            href="https://www.lincolnfinancial.com/public/individuals/products/lifeinsurance"
            target="_blank"
            rel="noreferrer"
          >
            Lincoln Financial life insurance <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </dialog>
  );
}
