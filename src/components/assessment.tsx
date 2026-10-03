"use client";
import LiveConversation from "./live-conversation";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  AudioLines,
  ChevronDown,
  Info,
  LoaderCircle,
  Mic,
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
import { KeyHighlights } from "./key-highlights";
import { InsightView } from "./insight-view";
import { useDictation } from "./use-dictation";
import type { HighlightKey } from "@/lib/highlights";
import type { LiveHandle, LiveStatus } from "./live-conversation";
import {
  applyProfilePatch,
  calculateScenario,
  confirmedEstimate,
  currency,
  emptyProfile,
  fieldInfo,
  missingFields,
  scenarioSchema,
  type Profile,
  type ProfileState,
  type Scenario,
} from "@/lib/needs";
import { nextQuestion, parseAmount, questionFor } from "@/lib/guided";

type Message = { id: number; role: "user" | "assistant"; text: string };
const intentLabels: Record<string, string> = {
  everyday: "Everyday expenses",
  mortgage: "A mortgage",
  children: "My children’s future",
};
const stateSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
});

export function Assessment({
  liveEnabled,
  speechEnabled,
}: {
  liveEnabled: boolean;
  speechEnabled: boolean;
}) {
  const params = useSearchParams();
  const initialIntent = intentLabels[params.get("intent") ?? ""] ?? "";
  const [state, setState] = useState<ProfileState>(() => ({
    profile: { ...emptyProfile, priorities: initialIntent },
    revision: 0,
    confirmedRevision: null,
  }));
  const current = useRef(state);
  const [messages, setMessages] = useState<Message[]>(() =>
    params.get("mode") === "text" && !liveEnabled
      ? [{ id: 0, role: "assistant", text: questionFor("dependents") }]
      : [],
  );
  const sequence = useRef(0);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const dictation = useDictation(speechEnabled, (text) => {
    const next = [draft.trim(), text].filter(Boolean).join(" ");
    if (next.length > 1000)
      return "That message is a little long. Try recording a shorter answer; your existing draft is unchanged.";
    setDraft(next);
    requestAnimationFrame(() => input.current?.focus());
  });
  const [editor, setEditor] = useState<"edit" | "review" | null>(null);
  const editing = useRef(false);
  editing.current = editor !== null;
  const [insight, setInsight] = useState<HighlightKey | null>(
    params.get("learn") === "true" ? "support" : null,
  );
  const example = false;
  const [skippedIncome, setSkippedIncome] = useState(false);
  const [status, setStatus] = useState<LiveStatus>("disconnected");
  const [error, setError] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const cancelDictation = dictation.cancel;
  useEffect(() => {
    if (editor || insight) cancelDictation();
  }, [editor, insight, cancelDictation]);
  const [activeScenario, setActiveScenario] = useState<Scenario>({});
  const live = useRef<LiveHandle>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const situation = useRef<HTMLDetailsElement>(null);
  const liveActive = liveMode && !["disconnected", "error"].includes(status);
  const isConfirmed = state.confirmedRevision === state.revision;
  const missing = missingFields(state.profile);
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
      show_education: guarded((args) => {
        const { focus } = z
          .object({
            focus: z
              .enum(["people", "support", "goals", "resources", "estimate"])
              .optional(),
          })
          .strict()
          .parse(args);
        setInsight(focus ?? "support");
        return "Comparison popup is open with charts, a policy toggle, and tradeoffs. Explain the choices without inventing prices.";
      }),
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
      setInsight("support");
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
  async function send() {
    const text = draft.trim();
    if (!text || status === "connecting" || dictation.busy) return;
    if (liveEnabled && !liveActive && !example) {
      const connected = await startLive(false);
      if (!connected) return;
    }
    setDraft("");
    addMessage("user", text);
    if ((liveActive || liveEnabled) && !example) live.current?.send(text);
    else guidedAnswer(text);
  }
  async function startLive(voice: boolean) {
    dictation.cancel();
    if (!liveEnabled) {
      setError(
        "Live conversation isn’t connected in this preview. You can type answers to the guided questions, or review your inputs.",
      );
      return false;
    }
    if (!live.current) {
      setError(
        "Live chat is getting ready. Please try connecting again in a moment.",
      );
      return false;
    }
    setError("");
    setLiveMode(true);
    return live.current.start(voice);
  }
  function stopLive() {
    live.current?.stop();
    setLiveMode(false);
    addMessage(
      "assistant",
      "Conversation paused. You can keep typing or start voice again whenever you’re ready.",
    );
  }

  return (
    <div className="assessment-page">
      <header className="site-header">
        <div className="assessment-nav">
          <Brand />
        </div>
      </header>
      <main id="main" className="assessment-layout">
        <aside className="situation-panel">
          <details className="situation-details" open ref={situation}>
            <summary>
              <span>
                <Users size={17} /> Key details
              </span>
              <ChevronDown size={16} />
            </summary>
            <KeyHighlights
              state={state}
              example={example}
              processing={status === "thinking"}
              onOpen={(key) => {
                dictation.cancel();
                setInsight(key);
              }}
            />
          </details>
        </aside>
        <section className="chat-panel" aria-labelledby="chat-title">
          <h1 id="chat-title" className="sr-only">
            Conversation with Linc
          </h1>
          <div
            className={`chat-transcript${messages.length === 0 ? " chat-transcript--empty" : ""}`}
            ref={transcript}
          >
            <div className="conversation-content">
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-emblem" aria-hidden="true">
                    <Sprout size={28} strokeWidth={1.5} />
                  </div>
                  <Button
                    className="btn btn-primary"
                    disabled={liveActive || dictation.busy}
                    onClick={() => startLive(true)}
                  >
                    <Mic size={17} />
                    Start voice conversation
                  </Button>
                </div>
              ) : (
                <>
                  <div className="session-label">
                    {example
                      ? "FICTIONAL EXAMPLE"
                      : liveEnabled && !example
                        ? "CHAT WITH LINC"
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
                        <div className="message-bubble">
                          <span className="sr-only">
                            {message.role === "assistant" ? "Linc: " : "You: "}
                          </span>
                          <p>{message.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {status === "thinking" && (
                    <div className="assistant-working">
                      <LoaderCircle size={14} className="spin" />
                      Linc is thinking…
                    </div>
                  )}
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
                  onLearn={() => setInsight("support")}
                  onScenario={setActiveScenario}
                  externalScenario={activeScenario}
                />
              )}
            </div>
          </div>
          <div className="composer-area">
            {dictation.error && (
              <div className="connection-error" role="alert">
                <Info size={16} />
                <span>{dictation.error}</span>
                <button
                  onClick={dictation.clearError}
                  aria-label="Dismiss speech notice"
                >
                  ×
                </button>
              </div>
            )}
            {dictation.busy && (
              <div className="dictation-status" role="status">
                <span>
                  {dictation.phase === "recording" ? (
                    <>
                      <i className="recording-dot" />
                      Recording · {Math.floor(dictation.seconds / 60)}:
                      {String(dictation.seconds % 60).padStart(2, "0")} / 1:00
                    </>
                  ) : (
                    <>
                      <LoaderCircle size={14} className="spin" />
                      {dictation.phase === "permission"
                        ? "Allow microphone access to begin"
                        : "Transcribing with ElevenLabs…"}
                    </>
                  )}
                </span>
                <button type="button" onClick={dictation.cancel}>
                  Cancel
                </button>
              </div>
            )}
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
                        ? "Linc is speaking"
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
                ref={input}
                id="message-input"
                aria-label="Your message"
                value={draft}
                maxLength={1000}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message Linc…"
                disabled={status === "connecting" || dictation.busy}
              />
              <button
                type="button"
                className={`mic-button${dictation.phase === "recording" ? " is-recording" : ""}`}
                onClick={() =>
                  dictation.phase === "recording"
                    ? dictation.finish()
                    : void dictation.start()
                }
                disabled={
                  liveActive ||
                  dictation.phase === "permission" ||
                  dictation.phase === "transcribing"
                }
                aria-label={
                  dictation.phase === "recording"
                    ? "Stop recording and transcribe"
                    : "Dictate a message"
                }
                title={
                  liveActive
                    ? "End the live conversation to dictate a message"
                    : "Speech-to-text with ElevenLabs"
                }
              >
                {dictation.phase === "recording" ? (
                  <Square size={15} fill="currentColor" />
                ) : dictation.phase === "transcribing" ? (
                  <LoaderCircle size={18} className="spin" />
                ) : (
                  <Mic size={18} />
                )}
              </button>
              <Button
                type="submit"
                className="send-button"
                aria-label="Send message"
                disabled={
                  !draft.trim() || status === "connecting" || dictation.busy
                }
              >
                <ArrowUp size={18} />
              </Button>
            </form>
            {dictation.phase === "recording" && (
              <p className="dictation-hint">
                Press stop to transcribe. You can review the text before
                sending.
              </p>
            )}
            <p className="composer-footnote">
              <ShieldCheck size={12} />
              Educational guidance. Estimates are not policy quotes.
            </p>
          </div>
        </section>
      </main>
      {insight && (
        <InsightView
          state={state}
          initialFocus={insight}
          example={example}
          onClose={() => setInsight(null)}
          onEdit={() => {
            setInsight(null);
            setEditor("review");
          }}
        />
      )}
      {editor && (
        <ProfileEditor
          key={state.revision}
          profile={state.profile}
          review={editor === "review"}
          onSave={saveProfile}
          onClose={() => setEditor(null)}
        />
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
