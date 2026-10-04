"use client";
import LiveConversation from "./live-conversation";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Info,
  LoaderCircle,
  Mic,
  Pause,
  Play,
  ShieldCheck,
  Square,
  Users,
  FileText,
} from "lucide-react";
import { z } from "zod";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { LincAvatar } from "./linc-avatar";
import { AssistantReply, ThinkingIndicator } from "./assistant-reply";
import {
  prepareReview,
  confirmInConversation,
  isClearConfirmation,
  type ConversationReview,
} from "@/lib/conversation-review";
import { KeyHighlights } from "./key-highlights";
import { InsightView, type InsightSection } from "./insight-view";
import { SummaryReport } from "./summary-report";
import { applyIntakePatch, captureClarifications } from "@/lib/intake";
import { buildSummary } from "@/lib/summary";
import { VoiceComposer, type VoiceStartOrigin } from "./voice-stage";
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
import {
  nextQuestion,
  parseAmount,
  parseCorrection,
  questionFor,
} from "@/lib/guided";

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
    params.get("mode") === "text" && !liveEnabled
      ? [{ id: 0, role: "assistant", text: questionFor("dependents") }]
      : [],
  );
  const sequence = useRef(0);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const pendingReview = useRef<ConversationReview | null>(null);
  const latestUser = useRef<{ id: number; text: string } | null>(null);
  const [insight, setInsight] = useState<HighlightKey | null>(
    params.get("learn") === "true" ? "support" : null,
  );
  const [insightSection, setInsightSection] = useState<
    InsightSection | undefined
  >(params.get("learn") === "true" ? "options" : undefined);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const previousAssistant = useRef("");
  const example = false;
  const [skippedIncome, setSkippedIncome] = useState(false);
  const [status, setStatus] = useState<LiveStatus>("disconnected");
  const [error, setError] = useState("");
  const [liveMode, setLiveMode] = useState(false);
  const [paused, setPaused] = useState(false);
  const [microphoneMuted, setMicrophoneMuted] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const [livePartial, setLivePartial] = useState("");
  const [transcriptionNotice, setTranscriptionNotice] = useState("");
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [voiceOrigin, setVoiceOrigin] = useState<VoiceStartOrigin | null>(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [activeScenario, setActiveScenario] = useState<Scenario>({});
  const live = useRef<LiveHandle>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const messageFlow = useRef<HTMLDivElement>(null);
  const liveActive = liveMode && !["disconnected", "error"].includes(status);
  const question = nextQuestion(state.profile, skippedIncome);

  const addMessage = useCallback((role: Message["role"], text: string) => {
    const message = { id: ++sequence.current, role, text };
    if (role === "user") {
      latestUser.current = message;
      setFinished(false);
      const clarified = captureClarifications(
        current.current,
        text,
        previousAssistant.current,
      );
      if (clarified !== current.current) update(clarified);
    } else previousAssistant.current = text;
    setMessages((prev) => [...prev, message]);
  }, []);
  function update(next: ProfileState) {
    if (next.revision !== current.current.revision)
      pendingReview.current = null;
    current.current = next;
    setState(next);
    setActiveScenario({});
  }
  const handleStatus = useCallback((next: LiveStatus, message?: string) => {
    setStatus(next);
    if (message) setError(message);
  }, []);
  const scrollToLatestMessage = useCallback(() => {
    const panel = transcript.current;
    const flow = messageFlow.current;
    if (!panel || !flow) return;
    const bottomPadding =
      parseFloat(getComputedStyle(panel).paddingBottom) || 0;
    panel.scrollTo({
      top: Math.max(
        0,
        panel.scrollTop +
          flow.getBoundingClientRect().bottom -
          panel.getBoundingClientRect().top -
          panel.clientHeight +
          bottomPadding,
      ),
      // Smooth scrolling restarts on each streamed line and can lag behind speech.
      behavior: "instant",
    });
  }, []);
  useEffect(() => {
    scrollToLatestMessage();
  }, [messages.length, status, scrollToLatestMessage]);
  useEffect(() => {
    const panel = transcript.current;
    const flow = messageFlow.current;
    if (!panel || !flow) return;
    // Reply text is revealed inside child components, so message count alone
    // does not reflect its growing height. Also follow voice/composer resizing.
    const observer = new ResizeObserver(scrollToLatestMessage);
    observer.observe(flow);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [scrollToLatestMessage]);
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
          pendingReview: pendingReview.current,
        }),
      update_profile: guarded((args) => {
        const { expectedRevision, patch } = stateSchema
          .extend({ patch: z.string().max(10000) })
          .strict()
          .parse(args);
        const next = applyIntakePatch(
          current.current,
          JSON.parse(patch),
          expectedRevision,
          latestUser.current?.text ?? "",
        );
        update(next);
        return {
          ...next,
          missing: missingFields(next.profile),
          instruction:
            "Details captured. Reply in 1 or 2 short sentences, at most 35 words. Ask only the next missing question; do not repeat captured facts. Resolve clarifications first. Annual education costs need educationPlan annualAmount, years, scope (combined or per-person), and people if per-person. The app calculates the total; do not replace annual costs with one-time amounts. Use review_profile when complete. No forms.",
        };
      }),
      review_profile: guarded((args) => {
        const { expectedRevision } = stateSchema.strict().parse(args);
        if (pendingReview.current?.revision !== current.current.revision)
          pendingReview.current = prepareReview(
            current.current,
            expectedRevision,
            latestUser.current?.id ?? 0,
          );
        else if (expectedRevision !== current.current.revision)
          throw new Error("Read the latest profile first.");
        return {
          ...pendingReview.current,
          instruction:
            "Use this compact recap once, preserving every calculation amount and grouped $0 exclusions. Do not repeat optional income, budget, family context, or priorities. Ask Is that correct? Then WAIT for a new customer reply. No preamble, forms, or buttons.",
        };
      }),
      calculate_needs: guarded((args) => {
        const { expectedRevision, confirmationQuote } = stateSchema
          .extend({ confirmationQuote: z.string().max(1000).optional() })
          .strict()
          .parse(args);
        if (expectedRevision !== current.current.revision)
          throw new Error("Read the latest profile first.");
        if (current.current.confirmedRevision !== current.current.revision) {
          update(
            confirmInConversation(
              current.current,
              pendingReview.current,
              latestUser.current,
              confirmationQuote ?? "",
            ),
          );
        }
        return {
          ...confirmedEstimate(current.current, expectedRevision),
          instruction:
            "Reply in ONE paragraph of 3 short sentences, at most 65 words. State the additional coverage and a policy direction tied to the customer's goal. Explain support multiplication and total needs minus resources with these exact amounts. Finish with ONE personal tradeoff or next step. The sidebar summary contains the full breakdown and PDF. Do not repeat the recap, list every qualification, or ask another question.",
        };
      }),
      explore_scenario: guarded((args) => {
        const { expectedRevision, ...scenario } = stateSchema
          .extend(scenarioSchema.shape)
          .strict()
          .parse(args);
        const baseline = confirmedEstimate(current.current, expectedRevision);
        const result = calculateScenario(current.current.profile, scenario);
        setActiveScenario(scenario);
        setInsightSection("what-if");
        setInsight("estimate");
        return {
          original: baseline,
          scenario: result,
          difference: result.additional - baseline.additional,
          assumptions: scenario,
          instruction:
            "In at most 2 short sentences and 35 words, explain the changed assumption and its impact. The original profile is unchanged. Do not repeat the full estimate.",
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
        setInsightSection("options");
        return "Comparison popup is open with charts, a policy toggle, and tradeoffs. Explain the choices without inventing prices.";
      }),
    };
  }, []);
  const context = JSON.stringify({
    ...state,
    example,
    scenario: activeScenario,
  });

  function guidedAnswer(text: string) {
    const correction = parseCorrection(text);
    if (correction) {
      const next = applyProfilePatch(
        current.current,
        correction,
        current.current.revision,
      );
      update(next);
      const following = nextQuestion(next.profile, skippedIncome);
      if (following === null) {
        pendingReview.current = prepareReview(
          next,
          next.revision,
          latestUser.current?.id ?? 0,
        );
        addMessage(
          "assistant",
          `I’ve updated that. ${pendingReview.current.summary}`,
        );
      } else
        addMessage("assistant", `I’ve updated that. ${questionFor(following)}`);
      return;
    }
    if (/^(term|whole life|learn|compare)/i.test(text)) {
      setInsight("support");
      addMessage(
        "assistant",
        "Let’s look at how term and whole life work. Your coverage amount and policy type are separate decisions.",
      );
      return;
    }
    if (question === null) {
      if (pendingReview.current && isClearConfirmation(text)) {
        const confirmed = confirmInConversation(
          current.current,
          pendingReview.current,
          latestUser.current,
          text,
        );
        update(confirmed);
        const result = confirmedEstimate(confirmed, confirmed.revision);
        addMessage(
          "assistant",
          result.additional === 0
            ? "Based on the numbers you confirmed, your selected resources cover the needs in this estimate. Open your coverage picture in Key details for the breakdown. We can still explore policy tradeoffs and changes in your plans."
            : `Your planning estimate is ${currency(result.additional)} in additional coverage: ${currency(result.totalNeeds)} of needs minus ${currency(result.totalResources)} already in place. For support lasting ${confirmed.profile.years} years, term coverage is one option to explore; whole life may be relevant to lifelong goals. This guided estimate cannot decide policy suitability, and actual costs depend on the policy.`,
        );
      } else {
        pendingReview.current = prepareReview(
          current.current,
          current.current.revision,
          latestUser.current?.id ?? 0,
        );
        addMessage("assistant", pendingReview.current.summary);
      }
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
          `It’s okay not to know yet. ${question === "dependents" ? "You can describe anyone you have in mind, or say you’re just exploring." : fieldInfo[question].help} We can talk through a rough estimate or come back to it. I’ll leave this blank rather than assume a number.`,
        );
      return;
    }
    let patch: Partial<Profile>;
    if (question === "dependents") {
      if (text.length > 500) {
        addMessage(
          "assistant",
          "For this first step, could you give me a shorter description of who you’re thinking of—under 500 characters? We can talk about your priorities next.",
        );
        return;
      }
      patch = { dependents: text };
    } else {
      const amount = parseAmount(text, question);
      if (amount === null) {
        addMessage(
          "assistant",
          `For this guided step, enter one ${question === "years" ? "whole number from 1 to 60" : "amount, such as 40,000 or 40k"}. ${question === "annualSupport" || question === "income" ? "You can include “per month” and I’ll show the yearly equivalent for you to review." : "Live chat can understand several details together."}`,
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
        : `${fieldInfo[question].label}: ${question === "years" ? `${next.profile.years} years` : `${currency(next.profile[question]!)}${question === "income" || question === "annualSupport" ? " per year" : ""}`}. You can correct that in your next message.`;
    const following = nextQuestion(next.profile, skippedIncome);
    if (following === null) {
      pendingReview.current = prepareReview(
        next,
        next.revision,
        latestUser.current?.id ?? 0,
      );
      addMessage("assistant", pendingReview.current.summary);
    } else addMessage("assistant", `${value}\n\n${questionFor(following)}`);
  }
  async function send() {
    const text = draft.trim();
    if (!text || status === "connecting") return;
    if (liveEnabled && !liveActive && !example) {
      const connected = await startLive(false);
      if (!connected) return;
    }
    setDraft("");
    addMessage("user", text);
    if ((liveActive || liveEnabled) && !example) live.current?.send(text);
    else guidedAnswer(text);
  }
  async function startLive(voice: boolean, trigger?: HTMLButtonElement) {
    if (!liveEnabled) {
      setError(
        "Live conversation isn’t connected in this preview. You can answer the guided questions by typing.",
      );
      return false;
    }
    if (!live.current) {
      setError(
        "Live chat is getting ready. Please try connecting again in a moment.",
      );
      return false;
    }
    const bounds =
      voice && !voiceVisible ? trigger?.getBoundingClientRect() : null;
    setVoiceOrigin(
      bounds
        ? {
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
            height: bounds.height,
            iconWidth:
              trigger?.querySelector("svg")?.getBoundingClientRect().width ??
              28,
          }
        : null,
    );
    setError("");
    setFinished(false);
    setPaused(false);
    setMicrophoneMuted(false);
    setVoiceMode(voice);
    setVoiceVisible(voice);
    setLiveMode(true);
    return live.current.start(voice);
  }
  function stopLive(pause = false) {
    live.current?.stop();
    setLiveMode(false);
    setPaused(pause);
    setMicrophoneMuted(false);
    setLivePartial("");
    setTranscriptionNotice("");
  }

  function exitVoice() {
    stopLive();
    setVoiceVisible(false);
    setVoiceOrigin(null);
    requestAnimationFrame(() => input.current?.focus());
  }
  function finishConversation() {
    stopLive();
    setVoiceVisible(false);
    setVoiceOrigin(null);
    setFinished(true);
    setSummaryOpen(true);
  }
  function toggleMicrophone() {
    const next = !microphoneMuted;
    if (live.current?.setMuted(next)) setMicrophoneMuted(next);
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
          <section
            className="situation-details"
            aria-labelledby="key-details-title"
          >
            <h2 className="situation-heading" id="key-details-title">
              <Users size={17} /> Key details
            </h2>
            <KeyHighlights
              state={state}
              example={example}
              processing={status === "thinking"}
              onOpen={(focus) => {
                setInsightSection(undefined);
                setInsight(focus);
              }}
            />
            {messages.length > 0 && (
              <div className="sidebar-summary-action">
                <button
                  className={
                    buildSummary(state).confirmed
                      ? "btn btn-primary"
                      : "btn btn-secondary"
                  }
                  disabled={status === "connecting" || status === "thinking"}
                  onClick={
                    finished ? () => setSummaryOpen(true) : finishConversation
                  }
                >
                  <FileText size={16} />{" "}
                  {finished
                    ? "View my summary"
                    : buildSummary(state).confirmed
                      ? "Finish & view summary"
                      : "Finish & view progress"}
                </button>
              </div>
            )}
          </section>
        </aside>
        <section className="chat-panel" aria-labelledby="chat-title">
          <h1 id="chat-title" className="sr-only">
            Conversation with Linc
          </h1>
          <div
            className={
              "welcome-scene" +
              (messages.length === 0 && !voiceVisible ? " is-visible" : "")
            }
            aria-hidden="true"
          >
            <Image
              className="welcome-landscape"
              src="/illustrations/welcome-landscape.png"
              alt=""
              width={2172}
              height={724}
              sizes="(max-width: 760px) 100vw, (max-width: 1050px) 70vw, 80vw"
              priority
              draggable={false}
            />
          </div>
          <div
            className={
              "chat-transcript" +
              (messages.length === 0 ? " chat-transcript--empty" : "")
            }
            ref={transcript}
          >
            <div className="conversation-content">
              <div ref={messageFlow}>
                {messages.length === 0 ? (
                  voiceVisible ? null : (
                    <div className="welcome">
                      <button
                        type="button"
                        className="welcome-microphone"
                        disabled={status === "connecting"}
                        aria-busy={status === "connecting"}
                        aria-label={
                          status === "connecting"
                            ? "Connecting to Linc"
                            : "Start voice conversation"
                        }
                        onClick={(event) =>
                          void startLive(true, event.currentTarget)
                        }
                      >
                        {status === "connecting" ? (
                          <LoaderCircle
                            size={44}
                            className="spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Mic size={44} strokeWidth={1.7} aria-hidden="true" />
                        )}
                      </button>
                      <p className="welcome-prompt">
                        Ask Linc about life insurance
                      </p>
                    </div>
                  )
                ) : (
                  <div
                    className="messages"
                    role="log"
                    aria-label="Conversation"
                    aria-live="polite"
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={"message " + message.role}
                      >
                        {message.role === "assistant" && <LincAvatar />}
                        <div className="message-bubble">
                          <span className="sr-only">
                            {message.role === "assistant" ? "Linc: " : "You: "}
                          </span>
                          {message.role === "assistant" ? (
                            <AssistantReply text={message.text} />
                          ) : (
                            <p>{message.text}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {status === "thinking" &&
                  messages.at(-1)?.role !== "assistant" && (
                    <div className="assistant-working">
                      <LincAvatar />
                      <ThinkingIndicator />
                    </div>
                  )}
              </div>
            </div>
          </div>
          <div
            className={
              "composer-area" + (voiceVisible ? " composer-area--voice" : "")
            }
          >
            {voiceVisible ? (
              <VoiceComposer
                origin={voiceOrigin}
                status={status}
                muted={microphoneMuted}
                words={livePartial}
                inputLevel={inputLevel}
                error={error}
                notice={transcriptionNotice}
                onToggleMute={toggleMicrophone}
                onReconnect={() => void startLive(true)}
                onExit={exitVoice}
              />
            ) : (
              <>
                {error && (
                  <div className="connection-error" role="alert">
                    <Info size={16} />
                    <span>{error}</span>
                    <button
                      type="button"
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
                        <>
                          <LoaderCircle className="spin" size={15} />{" "}
                          Connecting…
                        </>
                      ) : (
                        "Connected to Linc"
                      )}
                    </span>
                    <div className="conversation-actions">
                      {status !== "connecting" && (
                        <button type="button" onClick={() => stopLive(true)}>
                          <Pause size={14} /> Pause
                        </button>
                      )}
                      <button type="button" onClick={finishConversation}>
                        <Square size={12} /> End
                      </button>
                    </div>
                  </div>
                ) : paused ? (
                  <div className="live-controls">
                    <span>Paused</span>
                    <div className="conversation-actions">
                      <button
                        type="button"
                        onClick={() => startLive(voiceMode)}
                      >
                        <Play size={14} /> Resume conversation
                      </button>
                      <button type="button" onClick={finishConversation}>
                        <Square size={12} /> End
                      </button>
                    </div>
                  </div>
                ) : finished ? (
                  <div className="live-controls">
                    <span>
                      Conversation finished. Your details are still here.
                    </span>
                    <button
                      className="text-link"
                      onClick={() => setSummaryOpen(true)}
                    >
                      View summary
                    </button>
                  </div>
                ) : null}
                <form
                  className="composer"
                  autoComplete="off"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <input
                    ref={input}
                    id="message-input"
                    aria-label="Your message"
                    autoComplete="off"
                    value={draft}
                    maxLength={1000}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message Linc…"
                    disabled={status === "connecting"}
                  />
                  <button
                    type="button"
                    className="mic-button"
                    onClick={(event) =>
                      void startLive(true, event.currentTarget)
                    }
                    disabled={status === "connecting"}
                    aria-label="Start voice conversation"
                    title="Talk to Linc"
                  >
                    <Mic size={18} />
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
              </>
            )}
            <p className="composer-footnote">
              <ShieldCheck size={12} /> Educational guidance. Estimates are not
              policy quotes.
            </p>
          </div>
        </section>
      </main>
      {insight && (
        <InsightView
          state={state}
          initialFocus={insight}
          initialSection={insightSection}
          scenario={activeScenario}
          onScenario={setActiveScenario}
          example={example}
          onClose={() => setInsight(null)}
          onContinue={() => {
            setInsight(null);
            requestAnimationFrame(() => input.current?.focus());
          }}
        />
      )}
      {summaryOpen && (
        <SummaryReport
          state={state}
          onClose={() => {
            setSummaryOpen(false);
            requestAnimationFrame(() => input.current?.focus());
          }}
        />
      )}
      {liveEnabled && (
        <LiveConversation
          ref={live}
          context={context}
          history={messages}
          onPartialTranscript={setLivePartial}
          onTranscriptionNotice={setTranscriptionNotice}
          onInputLevel={setInputLevel}
          tools={tools}
          onMessage={addMessage}
          onStatus={handleStatus}
        />
      )}
    </div>
  );
}
