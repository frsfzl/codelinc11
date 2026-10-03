"use client";
import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import {
  fieldInfo,
  missingFields,
  profileSchema,
  type NumericKey,
  type Profile,
} from "@/lib/needs";

const groups: { title: string; keys: NumericKey[] }[] = [
  { title: "Everyday life", keys: ["income", "annualSupport", "years"] },
  {
    title: "Balances and future goals",
    keys: ["mortgage", "debts", "education", "finalExpenses", "otherNeeds"],
  },
  {
    title: "What you already have",
    keys: ["employerCoverage", "personalCoverage", "savings"],
  },
  { title: "Your comfort zone", keys: ["budget"] },
];
export function ProfileEditor({
  profile,
  onSave,
  onClose,
  review = false,
}: {
  profile: Profile;
  onSave: (profile: Profile, confirm: boolean) => void;
  onClose: () => void;
  review?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Profile>({ ...profile });
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const missing = missingFields(draft);
  function save(confirm: boolean) {
    const parsed = profileSchema.safeParse(draft);
    if (!parsed.success) {
      setError(
        "Please use positive amounts (or zero), and a whole number of years from 1 to 60. Amounts must be under $100 million.",
      );
      return;
    }
    if (confirm && missing.length) {
      setError(
        `Please fill in: ${missing.map((key) => fieldInfo[key].label).join(", ")}. Enter 0 only if you want to exclude that item.`,
      );
      return;
    }
    onSave(parsed.data, confirm);
    onClose();
  }
  return (
    <dialog
      className="profile-dialog"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="profile-title"
    >
      <div className="dialog-header">
        <div>
          <div className="eyebrow">YOUR INPUTS, YOUR CHOICES</div>
          <h2 id="profile-title">
            {review ? "Let’s check your numbers." : "Your situation"}
          </h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close profile editor"
        >
          <X size={21} />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(review);
        }}
      >
        <div className="dialog-body">
          <p className="form-intro">
            All amounts are in US dollars. Leave unknown amounts blank. Enter{" "}
            <strong>0</strong> to deliberately exclude an item.
          </p>
          <label className="form-field full">
            <span>Who are you thinking about?</span>
            <input
              maxLength={500}
              value={draft.dependents}
              onChange={(e) =>
                setDraft({ ...draft, dependents: e.target.value })
              }
              placeholder="For example, my partner and two children"
            />
          </label>
          {groups.map((group) => (
            <fieldset key={group.title}>
              <legend>{group.title}</legend>
              <div className="field-grid">
                {group.keys.map((key) => (
                  <label
                    key={key}
                    className="form-field"
                    htmlFor={`field-${key}`}
                  >
                    <span>
                      {fieldInfo[key].label}{" "}
                      {!(["income", "budget"] as string[]).includes(key) ? (
                        <span className="required-label">*</span>
                      ) : (
                        <span className="optional-label">optional</span>
                      )}
                    </span>
                    <div className="number-input">
                      {key !== "years" && <span>$</span>}
                      <input
                        id={`field-${key}`}
                        type="number"
                        min={key === "years" ? 1 : 0}
                        max={key === "years" ? 60 : 100000000}
                        step={key === "years" ? 1 : 0.01}
                        value={draft[key] ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [key]:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        placeholder="Not provided"
                        aria-describedby={`help-${key}`}
                      />
                      <span>{fieldInfo[key].unit}</span>
                    </div>
                    <small id={`help-${key}`}>{fieldInfo[key].help}</small>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <label className="form-field full">
            <span>
              What matters most to you?{" "}
              <span className="optional-label">optional</span>
            </span>
            <textarea
              maxLength={1000}
              rows={3}
              value={draft.priorities}
              onChange={(e) =>
                setDraft({ ...draft, priorities: e.target.value })
              }
              placeholder="Everyday stability, a home paid off, a lasting legacy…"
            />
          </label>
          <div className="review-note">
            <Check size={18} />
            <p>
              By confirming, you’re checking that these amounts reflect your
              choices and that family support does not count the same debts or
              goals twice.
            </p>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-footer">
          <span>
            {missing.length
              ? `${missing.length} estimate fields left`
              : "Everything is ready to review"}
          </span>
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => save(false)}
            >
              Save for later
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => save(true)}
            >
              Confirm & see estimate <Check size={16} />
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
