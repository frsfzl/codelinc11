"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  HeartHandshake,
  Info,
  LoaderCircle,
  MessageCircle,
  Mic,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Square,
  Users,
} from "lucide-react";
import { z } from "zod";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { CoverageResult } from "./coverage-result";
import { ProfileEditor } from "./profile-editor";
import { Education } from "./education";
import type { LiveHandle, LiveStatus } from "./live-conversation";
import {
  applyProfilePatch,
  calculateScenario,
  confirmedEstimate,
  currency,
  emptyProfile,
  exampleProfile,
  fieldInfo,
  missingFields,
  requiredKeys,
  scenarioSchema,
  type NumericKey,
  type Profile,
  type ProfileState,
  type Scenario,
} from "@/lib/needs";
import { nextQuestion, parseAmount, questionFor } from "@/lib/guided";

const LiveConversation = dynamic(() => import("./live-conversation"), {
  ssr: false,
});
type Message = { id: number; role: "user" | "assistant"; text: string };
const intentLabels: Record<string, string> = {
  everyday: "Everyday expenses",
  mortgage: "A mortgage",
  children: "My children’s future",
};
const stateSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
});

export function Assessment({ liveEnabled }: { liveEnabled: boolean }) {
  const params = useSearchParams();
  const initialIntent = intentLabels[params.get("intent") ?? ""] ?? "";
  const [state, setState] = useState<ProfileState>(() => ({
    profile: { ...emptyProfile, priorities: initialIntent },
    revision: 0,
    confirmedRevision: null,
  }));
  const current = useRef(state);
  const [messages, setMessages] = useState<Message[]>(() =>
    params.get("mode") === "text"
      ? [{ id: 0, role: "assistant", text: questionFor("dependents") }]
      : [],
  );
  const sequence = useRef(0);
  const [draft, setDraft] = useState("");
  const [editor, setEditor] = useState<"edit" | "review" | null>(null);
  const editing = useRef(false);
  editing.current = editor !== null;
  const [education, setEducation] = useState(params.get("learn") === "true");
  const [example, setExample] = useState(false);
  const [skippedIncome, setSkippedIncome] = useState(false);
  const [status, setStatus] = useState<LiveStatus>("disconnected");
  const [error, setError] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState<Scenario>({});
  const live = useRef<LiveHandle>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const situation = useRef<HTMLDetailsElement>(null);
  const liveActive = liveMode && !["disconnected", "error"].includes(status);
  const isConfirmed = state.confirmedRevision === state.revision;
  const missing = missingFields(state.profile);
  const completed = requiredKeys.length - missing.length;
  const question = nextQuestion(state.profile, skippedIncome);
  useEffect(() => {
    if (window.matchMedia("(max-width: 760px)").matches && situation.current)
      situation.current.open = false;
  }, []);

  const addMessage = useCallback((role: Message["role"], text: string) => {
    setMessages((prev) => [...prev, { id: ++sequence.current, role, text }]);
  }, []);
  function update(next: ProfileState) {
    current.current = next;
    setState(next);
    setActiveScenario({});
  }
  const handleStatus = useCallback((next: LiveStatus, message?: string) => {
    setStatus(next);
    if (message) setError(message);
  }, []);
  useEffect(() => {
    const panel = transcript.current;
    if (!panel) return;
    const result = panel.querySelector(".result-card");
    if (isConfirmed && result)
      panel.scrollTop +=
        result.getBoundingClientRect().top -
        panel.getBoundingClientRect().top -
        24;
    else panel.scrollTop = panel.scrollHeight;
  }, [messages.length, isConfirmed]);
  const tools = useMemo(() => {
    function guarded(work: (args: Record<string, unknown>) => unknown) {
      return (args: Record<string, unknown>) => {
        try {
          return JSON.stringify(work(args));
        } catch (e) {
          return JSON.stringify({
            error: e instanceof Error ? e.message : "Invalid tool request",
          });
        }
      };
    }
    return {
      get_profile: () =>
        JSON.stringify({
          ...current.current,
          missing: missingFields(current.current.profile),
        }),
      update_profile: guarded((args) => {
        if (editing.current)
          throw new Error(
            "The customer is reviewing or editing their inputs. Wait until they finish, then read get_profile again.",
          );
        const { expectedRevision, patch } = stateSchema
          .extend({ patch: z.string().max(10000) })
          .strict()
          .parse(args);
        const next = applyProfilePatch(
          current.current,
          JSON.parse(patch),
          expectedRevision,
        );
        update(next);
        return {
          ...next,
          missing: missingFields(next.profile),
          instruction:
            "Inputs were updated. Customer must review and confirm in the interface before calculation.",
        };
      }),
      calculate_needs: guarded((args) => {
        const { expectedRevision } = stateSchema.strict().parse(args);
        return confirmedEstimate(current.current, expectedRevision);
      }),
      explore_scenario: guarded((args) => {
        const { expectedRevision, ...scenario } = stateSchema
          .extend(scenarioSchema.shape)
          .strict()
          .parse(args);
        const baseline = confirmedEstimate(current.current, expectedRevision);
        const result = calculateScenario(current.current.profile, scenario);
        setActiveScenario(scenario);
        return {
          original: baseline,
          scenario: result,
          difference: result.additional - baseline.additional,
          assumptions: scenario,
          instruction:
            "Explain only the changed assumption. The original profile is unchanged.",
        };
      }),
      show_education: () => {
        setEducation(true);
        return "Term and whole life comparison is open. Explain the differences without recommending a specific policy or inventing prices.";
      },
    };
  }, []);
  const context = JSON.stringify({
    ...state,
    example,
    scenario: activeScenario,
  });

  function saveProfile(profile: Profile, confirm: boolean) {
    const revision = current.current.revision + 1;
    update({ profile, revision, confirmedRevision: confirm ? revision : null });
    if (confirm)
      addMessage(
        "assistant",
        "Your numbers are confirmed. The breakdown below shows what you want to provide, what’s already in place, and the estimated gap. You can change any input or explore a what-if.",
      );
    else
      addMessage(
        "assistant",
        `Your inputs have been updated. ${questionFor(nextQuestion(profile, skippedIncome))}`,
      );
  }
  function guidedAnswer(text: string) {
    if (/^(term|whole life|learn|compare)/i.test(text)) {
      setEducation(true);
      addMessage(
        "assistant",
        "Let’s look at how term and whole life work. Your coverage amount and policy type are separate decisions.",
      );
      return;
    }
    if (question === null) {
      addMessage(
        "assistant",
        "Your inputs are ready. Choose Review my numbers to confirm them, or Edit inputs to make a change. Guided mode uses set questions; live chat can handle an open-ended conversation when connected.",
      );
      return;
    }
    if (/^(skip|i don.?t know|not sure|unsure)/i.test(text)) {
      if (question === "income") {
        setSkippedIncome(true);
        addMessage(
          "assistant",
          `That’s okay—we can leave income blank. ${questionFor(nextQuestion(state.profile, true))}`,
        );
      } else
        addMessage(
          "assistant",
          `It’s okay not to know yet. ${question === "dependents" ? "You can describe anyone you have in mind, or say you’re just exploring." : fieldInfo[question].help} You can use Edit inputs to work through it in your own time. I’ll leave this blank rather than assume a number.`,
        );
      return;
    }
    let patch: Partial<Profile>;
    if (question === "dependents") {
      if (text.length > 500) {
        addMessage(
          "assistant",
          "For this first step, could you give me a shorter description of who you’re thinking of—under 500 characters? You can add your priorities in Edit inputs.",
        );
        return;
      }
      patch = { dependents: text };
    } else {
      const amount = parseAmount(text, question);
      if (amount === null) {
        addMessage(
          "assistant",
          `For this guided step, enter one ${question === "years" ? "whole number from 1 to 60" : "amount, such as 40,000 or 40k"}. ${question === "annualSupport" || question === "income" ? "You can include “per month” and I’ll show the yearly equivalent for you to review." : "Use Edit inputs if you’d like to change several things together."}`,
        );
        return;
      }
      patch = { [question]: amount };
    }
    const next = applyProfilePatch(
      current.current,
      patch,
      current.current.revision,
    );
    update(next);
    const value =
      question === "dependents"
        ? "Thank you. We’ll keep them in mind."
        : `${fieldInfo[question].label}: ${question === "years" ? `${next.profile.years} years` : `${currency(next.profile[question]!)}${question === "income" || question === "annualSupport" ? " per year" : ""}`}. You’ll review this before we calculate.`;
    addMessage(
      "assistant",
      `${value}\n\n${questionFor(nextQuestion(next.profile, skippedIncome))}`,
    );
  }
  function send() {
    const text = draft.trim();
    if (!text || status === "connecting") return;
    setDraft("");
    addMessage("user", text);
    if (liveActive) live.current?.send(text);
    else guidedAnswer(text);
  }
  function loadExample() {
    live.current?.stop();
    setLiveMode(false);
    setExample(true);
    setError("");
    setSkippedIncome(false);
    update({
      profile: { ...exampleProfile },
      revision: current.current.revision + 1,
      confirmedRevision: null,
    });
    setMessages([
      {
        id: ++sequence.current,
        role: "assistant",
        text: "Let’s walk through a fictional family: a partner and two children, ages 3 and 7. They want $40,000 a year for 15 years, a $220,000 mortgage paid off, and $80,000 for education. They have $150,000 in employer coverage and $50,000 in allocated savings. Other items are explicitly set to zero.\n\nReview these example numbers, then see how they fit together.",
      },
    ]);
  }
  function reset() {
    live.current?.stop();
    setLiveMode(false);
    setExample(false);
    setSkippedIncome(false);
    setError("");
    setDraft("");
    setMessages([]);
    setResetOpen(false);
    update({
      profile: { ...emptyProfile },
      revision: current.current.revision + 1,
      confirmedRevision: null,
    });
  }
  function startLive(voice: boolean) {
    if (!liveEnabled) {
      setError(
        "Live conversation isn’t connected in this preview. You can type answers to the guided questions, edit your inputs, or try the fictional example.",
      );
      return;
    }
    if (!live.current) {
      setError(
        "Live chat is getting ready. Please try connecting again in a moment.",
      );
      return;
    }
    setError("");
    setLiveMode(true);
    void live.current?.start(voice);
  }
  function stopLive() {
    live.current?.stop();
    setLiveMode(false);
    addMessage(
      "assistant",
      `Live conversation ended. You can keep going in guided mode. ${questionFor(question)}`,
    );
  }

  const summaryRows: { label: string; key: NumericKey }[] = [
    { label: "Annual income", key: "income" },
    { label: "Family support / year", key: "annualSupport" },
    { label: "Support period", key: "years" },
    { label: "Mortgage", key: "mortgage" },
    { label: "Other debts", key: "debts" },
    { label: "Education goals", key: "education" },
    { label: "Final expenses", key: "finalExpenses" },
    { label: "Other goals", key: "otherNeeds" },
    { label: "Employer coverage", key: "employerCoverage" },
    { label: "Personal coverage", key: "personalCoverage" },
    { label: "Allocated savings", key: "savings" },
    { label: "Monthly budget", key: "budget" },
  ];
  return (
    <div className="assessment-page">
      <header className="site-header">
        <div className="assessment-nav">
          <Brand />
          <div className="assessment-title">
            YOUR NEXT CHAPTER, A LITTLE CLEARER
          </div>
          <button
            className="text-link reset-link"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw size={14} />
            Start fresh
          </button>
        </div>
      </header>
      <main id="main" className="assessment-layout">
        <aside className="situation-panel">
          <details className="situation-details" open ref={situation}>
            <summary>
              <span>
                <Users size={17} /> Your situation
              </span>
              <ChevronDown size={16} />
            </summary>
            <div className="situation-body">
              <div className="summary-intro">
                The pieces of your picture.
                <br />
                You can change these anytime.
              </div>
              {example && (
                <div className="example-badge">FICTIONAL EXAMPLE</div>
              )}
              <div className="progress-label">
                <span>
                  {completed} of {requiredKeys.length} estimate inputs
                </span>
                <span>
                  {isConfirmed ? (
                    <Check size={14} />
                  ) : (
                    `${Math.round((completed / requiredKeys.length) * 100)}%`
                  )}
                </span>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${(completed / requiredKeys.length) * 100}%`,
                  }}
                />
              </div>
              <div className="dependents-summary">
                <span>
                  <HeartHandshake size={15} /> WHO MATTERS TO YOU
                </span>
                <p>
                  {state.profile.dependents || "Let’s start with your story."}
                </p>
              </div>
              <div className="summary-rows">
                {summaryRows.map((row) => (
                  <button
                    key={row.key}
                    onClick={() => setEditor("edit")}
                    className="summary-row"
                  >
                    <span>{row.label}</span>
                    <strong
                      className={
                        state.profile[row.key] === null ? "not-provided" : ""
                      }
                    >
                      {state.profile[row.key] === null
                        ? "Not provided"
                        : row.key === "years"
                          ? `${state.profile[row.key]} years`
                          : currency(state.profile[row.key]!)}
                    </strong>
                  </button>
                ))}
              </div>
              {state.profile.priorities && (
                <div className="priority-summary">
                  <span>WHAT MATTERS MOST</span>
                  <p>{state.profile.priorities}</p>
                </div>
              )}
              <button
                className="btn btn-secondary edit-inputs"
                onClick={() => setEditor("edit")}
              >
                <Pencil size={14} />
                Edit inputs
              </button>
              <p className="sidebar-note">
                <ShieldCheck size={14} />
                {liveEnabled
                  ? "This app keeps inputs in this page only. Live chats are processed by ElevenLabs."
                  : "Your inputs stay in this page’s session. Refreshing clears them."}
              </p>
            </div>
          </details>
          <button
            className="sidebar-learning"
            onClick={() => setEducation(true)}
          >
            <BookOpen size={17} />
            <span>
              Term vs. whole life<small>Understand the differences</small>
            </span>
            <ArrowRight size={15} />
          </button>
        </aside>
        <section className="chat-panel" aria-labelledby="chat-title">
          <div className="chat-header">
            <div>
              <span className="avatar small-avatar">
                <Sprout size={19} />
              </span>
              <div>
                <h1 id="chat-title">A conversation with Steady</h1>
                <span>
                  <i
                    className={liveActive ? "status-dot active" : "status-dot"}
                  />
                  {liveActive
                    ? `Live ${status === "connected" ? "text conversation" : status}`
                    : "Guided mode · one step at a time"}
                </span>
              </div>
            </div>
            <button className="text-link sample-link" onClick={loadExample}>
              Try an example <ArrowRight size={14} />
            </button>
          </div>
          <div className="chat-transcript" ref={transcript}>
            <div className="conversation-content">
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-emblem">
                    <Sprout size={35} strokeWidth={1.5} />
                  </div>
                  <div className="eyebrow">
                    LET’S MAKE ROOM FOR WHAT MATTERS
                  </div>
                  <h2>
                    A little clarity starts
                    <br />
                    with your story.
                  </h2>
                  <p>
                    {initialIntent
                      ? `We’ll start with ${initialIntent.toLowerCase()}. `
                      : "You don’t need to have all the answers. "}
                    We’ll work through your family’s needs together, at a pace
                    that feels right.
                  </p>
                  <div className="welcome-question">
                    {questionFor("dependents")}
                  </div>
                  <div className="welcome-actions">
                    <Button
                      className="btn btn-primary"
                      onClick={() => startLive(true)}
                    >
                      <Mic size={17} />
                      Start voice conversation
                    </Button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        addMessage("assistant", questionFor(question));
                        document.getElementById("message-input")?.focus();
                      }}
                    >
                      <MessageCircle size={17} />I prefer to type
                    </button>
                  </div>
                  {liveEnabled ? (
                    <p className="connection-note">
                      Live text and voice are processed by ElevenLabs. Use only
                      information you’re comfortable sharing.
                    </p>
                  ) : (
                    <p className="connection-note">
                      <Info size={14} />
                      Live AI isn’t connected yet. Guided questions and the full
                      calculator are ready to explore.
                    </p>
                  )}
                  <div className="welcome-divider">
                    <span>or take a look around</span>
                  </div>
                  <button className="example-prompt" onClick={loadExample}>
                    <span>
                      <Users size={18} />
                      Walk through a fictional family’s story
                    </span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="session-label">
                    {example
                      ? "FICTIONAL EXAMPLE"
                      : liveActive
                        ? "LIVE CONVERSATION"
                        : "GUIDED QUESTIONS · NOT LIVE AI"}
                  </div>
                  <div
                    className="messages"
                    role="log"
                    aria-label="Conversation"
                    aria-live="polite"
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`message ${message.role}`}
                      >
                        <div className="message-avatar">
                          {message.role === "assistant" ? (
                            <Sprout size={16} />
                          ) : (
                            "You"
                          )}
                        </div>
                        <div>
                          <span className="message-name">
                            {message.role === "assistant" ? "Steady" : "You"}
                          </span>
                          <p>{message.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isConfirmed && (
                    <div className="review-action">
                      <button
                        className="btn btn-primary"
                        onClick={() => setEditor("review")}
                      >
                        {missing.length
                          ? "Review & fill in my numbers"
                          : "Review my numbers"}
                        <ArrowRight size={16} />
                      </button>
                      <span>
                        {missing.length
                          ? `${missing.length} inputs still needed. Nothing is assumed.`
                          : "A quick check before we calculate."}
                      </span>
                    </div>
                  )}
                </>
              )}
              {isConfirmed && (
                <CoverageResult
                  key={state.revision}
                  profile={state.profile}
                  example={example}
                  onLearn={() => setEducation(true)}
                  onScenario={setActiveScenario}
                  externalScenario={activeScenario}
                />
              )}
            </div>
          </div>
          <div className="composer-area">
            {error && (
              <div className="connection-error" role="alert">
                <Info size={16} />
                <span>{error}</span>
                <button
                  onClick={() => setError("")}
                  aria-label="Dismiss connection notice"
                >
                  ×
                </button>
              </div>
            )}
            {liveActive ? (
              <div className="live-controls">
                <span>
                  {status === "connecting" ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <AudioLines size={16} />
                  )}{" "}
                  {status === "connecting"
                    ? "Connecting…"
                    : status === "thinking"
                      ? "Thinking it through…"
                      : status === "speaking"
                        ? "Steady is speaking"
                        : "Ready when you are"}
                </span>
                <button onClick={stopLive}>
                  <Square size={12} />
                  End live conversation
                </button>
              </div>
            ) : (
              <div className="composer-context">
                <span>
                  {question && messages.length
                    ? `UP NEXT: ${question === "dependents" ? "WHO YOU’RE THINKING OF" : fieldInfo[question].label.toUpperCase()}`
                    : "A CONVERSATION, AT YOUR PACE"}
                </span>
                {liveEnabled && (
                  <button onClick={() => startLive(false)}>
                    Connect live text <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )}
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                id="message-input"
                aria-label="Your message"
                value={draft}
                maxLength={1000}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  liveActive
                    ? "Type a message…"
                    : "Type your answer, or ask about term vs. whole life…"
                }
                disabled={status === "connecting"}
              />
              <button
                type="button"
                className="mic-button"
                onClick={() => (liveActive ? stopLive() : startLive(true))}
                aria-label={
                  liveActive
                    ? "End live conversation"
                    : "Start voice conversation"
                }
              >
                {liveActive ? <Square size={16} /> : <Mic size={18} />}
              </button>
              <Button
                type="submit"
                className="send-button"
                aria-label="Send message"
                disabled={!draft.trim() || status === "connecting"}
              >
                <ArrowUp size={18} />
              </Button>
            </form>
            <p className="composer-footnote">
              <ShieldCheck size={12} />
              Educational guidance. Estimates are not policy quotes.
            </p>
          </div>
        </section>
      </main>
      {editor && (
        <ProfileEditor
          key={state.revision}
          profile={state.profile}
          review={editor === "review"}
          onSave={saveProfile}
          onClose={() => setEditor(null)}
        />
      )}
      {education && (
        <Education
          profile={state.profile}
          onClose={() => setEducation(false)}
        />
      )}
      {resetOpen && (
        <ResetDialog onCancel={() => setResetOpen(false)} onReset={reset} />
      )}
      {liveEnabled && (
        <LiveConversation
          ref={live}
          context={context}
          tools={tools}
          onMessage={addMessage}
          onStatus={handleStatus}
        />
      )}
    </div>
  );
}
function ResetDialog({
  onCancel,
  onReset,
}: {
  onCancel: () => void;
  onReset: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      className="reset-dialog"
      aria-labelledby="reset-title"
    >
      <h2 id="reset-title">A fresh start?</h2>
      <p>
        This clears the conversation and the numbers in this page, and ends any
        live session. It does not delete any records held by the conversation
        provider.
      </p>
      <div>
        <button className="btn btn-secondary" onClick={onCancel}>
          Keep my progress
        </button>
        <button className="btn btn-primary" onClick={onReset}>
          Clear & start fresh
        </button>
      </div>
    </dialog>
  );
}
