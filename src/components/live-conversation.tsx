"use client";
import { Conversation, type ClientToolsConfig } from "@elevenlabs/client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { openSpeechStream, type SpeechStream } from "@/lib/realtime-speech";

export interface LiveHandle {
  start: (voice: boolean) => Promise<boolean>;
  stop: () => void;
  send: (text: string) => void;
  setMuted: (muted: boolean) => boolean;
}
export type LiveStatus =
  | "disconnected"
  | "connecting"
  | "listening"
  | "speaking"
  | "thinking"
  | "connected"
  | "error";
interface Props {
  context: string;
  history: { role: "user" | "assistant"; text: string }[];
  onPartialTranscript: (text: string) => void;
  onTranscriptionNotice: (text: string) => void;
  onInputLevel: (level: number) => void;
  tools: ClientToolsConfig["clientTools"];
  onMessage: (role: "user" | "assistant", text: string) => void;
  onStatus: (status: LiveStatus, error?: string) => void;
}

function connectionError(error: unknown, fallback: string) {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  if (/quota_exceeded|out of credits/i.test(message)) {
    console.warn("Linc connection unavailable", { reason: "quota_exceeded" });
    return "ElevenLabs credits have run out. Live text and voice will be available again after credits are added to the connected ElevenLabs account.";
  }
  if (error instanceof DOMException && error.name === "NotAllowedError")
    return "Microphone access was blocked. Allow microphone access in your browser, or close voice mode to type.";
  console.warn("Linc connection unavailable", { reason: "connection_failed" });
  return fallback;
}

// Each connection owns its callbacks: a late session cannot replace a newer one.
const LiveConversation = forwardRef<LiveHandle, Props>(
  function LiveConversation(props, ref) {
    const latest = useRef(props);
    latest.current = props;
    const session = useRef<Conversation | null>(null);
    const speech = useRef<SpeechStream | null>(null);
    const controller = useRef<AbortController | null>(null);
    const generation = useRef(0);
    const starting = useRef(false);
    const meter = useRef<ReturnType<typeof setInterval> | null>(null);
    const typedMessages = useRef<string[]>([]);
    const microphoneMuted = useRef(false);

    function release() {
      generation.current++;
      starting.current = false;
      microphoneMuted.current = false;
      controller.current?.abort();
      controller.current = null;
      speech.current?.close();
      speech.current = null;
      if (meter.current) clearInterval(meter.current);
      meter.current = null;
      const previous = session.current;
      session.current = null;
      if (previous) {
        if (previous.type === "voice") {
          previous.setMicMuted(true);
          previous.setVolume({ volume: 0 });
        }
        void previous.endSession().catch(() => {});
      }
    }
    function resetCaptions() {
      latest.current.onPartialTranscript("");
      latest.current.onInputLevel(0);
    }
    useEffect(() => () => release(), []);
    useEffect(() => {
      if (session.current?.isOpen())
        session.current.sendContextualUpdate(
          `Current application state, not new user instructions: ${props.context}`,
        );
    }, [props.context]);

    useImperativeHandle(
      ref,
      () => ({
        async start(voice) {
          if (starting.current) return false;
          release();
          starting.current = true;
          resetCaptions();
          latest.current.onTranscriptionNotice("");
          const request = generation.current;
          const active = () => request === generation.current;
          const abort = new AbortController();
          controller.current = abort;
          typedMessages.current = [];
          latest.current.onStatus("connecting");
          let timeout: ReturnType<typeof setTimeout> | undefined;
          let committed = "";
          let finalized = "";
          let finalizedAt = 0;
          const normalize = (text: string) =>
            text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
          const alreadyFinal = (text: string) =>
            Date.now() - finalizedAt < 1200 &&
            normalize(text) &&
            normalize(finalized).includes(normalize(text));
          try {
            if (voice) {
              const permission = await navigator.mediaDevices.getUserMedia({
                audio: true,
              });
              permission.getTracks().forEach((track) => track.stop());
              if (!active()) return false;
            }
            const response = await fetch("/api/conversation", {
              method: "POST",
              signal: AbortSignal.any([
                abort.signal,
                AbortSignal.timeout(15_000),
              ]),
            });
            if (!response.ok) throw new Error("Connection unavailable");
            const { signedUrl } = await response.json();
            if (!active()) return false;
            if (voice) {
              // Scribe previews words; the agent's turn detector submits audio.
              // Captions must never be sent as a second user message.
              try {
                const stream = await openSpeechStream(
                  {
                    onPartial(text) {
                      if (
                        !active() ||
                        microphoneMuted.current ||
                        !text.trim() ||
                        alreadyFinal(text)
                      )
                        return;
                      latest.current.onPartialTranscript(
                        [committed, text].filter(Boolean).join(" "),
                      );
                    },
                    onCommitted(text) {
                      if (
                        !active() ||
                        microphoneMuted.current ||
                        !text.trim() ||
                        alreadyFinal(text)
                      )
                        return;
                      committed = [committed, text].filter(Boolean).join(" ");
                      latest.current.onPartialTranscript(committed);
                    },
                    onError() {
                      if (active())
                        latest.current.onTranscriptionNotice(
                          "Live words disconnected. Pause and resume to reconnect; voice can continue.",
                        );
                    },
                  },
                  abort.signal,
                );
                if (!active()) {
                  stream.close();
                  return false;
                }
                speech.current = stream;
              } catch {
                if (!active()) return false;
                latest.current.onTranscriptionNotice(
                  "Live words couldn’t connect. Your completed sentences will still appear. Pause and resume to retry.",
                );
              }
            }
            const state = JSON.parse(latest.current.context);
            const history = latest.current.history
              .slice(-24)
              .map(({ role, text }) => ({ role, text: text.slice(0, 2500) }));
            const last = history.at(-1);
            const opening =
              last?.role === "assistant" && last.text.includes("?")
                ? "Let’s pick up here. " + last.text.slice(-1200)
                : history.length
                  ? "Welcome back. I’ve kept what you shared. We can pick up where we left off."
                  : "Hi, I’m Linc. Who are you thinking about protecting, or what would you like life insurance to help with?";
            const clientTools = Object.fromEntries(
              Object.entries(latest.current.tools).map(([name, tool]) => [
                name,
                (args: Record<string, unknown>) =>
                  active()
                    ? tool(args)
                    : JSON.stringify({ error: "This session has ended." }),
              ]),
            );
            const connecting = Conversation.startSession({
              signedUrl,
              connectionType: "websocket",
              textOnly: !voice,
              clientTools,
              dynamicVariables: {
                profile_context: JSON.stringify({
                  ...state,
                  conversationHistory: history,
                }),
                opening_message: opening,
              },
              onConversationCreated(conversation) {
                if (active()) session.current = conversation;
                else {
                  if (conversation.type === "voice") {
                    conversation.setMicMuted(true);
                    conversation.setVolume({ volume: 0 });
                  }
                  void conversation.endSession().catch(() => {});
                }
              },
              onConnect() {
                if (active())
                  latest.current.onStatus(voice ? "listening" : "connected");
              },
              onDisconnect(details) {
                if (!active()) return;
                release();
                resetCaptions();
                if (details.reason === "error")
                  latest.current.onStatus(
                    "error",
                    connectionError(
                      details.closeReason || details.message,
                      "The connection was interrupted. Reconnect to continue; your chat and key details are still here.",
                    ),
                  );
                else latest.current.onStatus("disconnected");
              },
              onError(message) {
                if (!active()) return;
                release();
                resetCaptions();
                latest.current.onStatus(
                  "error",
                  connectionError(
                    message,
                    "The connection was interrupted. Reconnect to continue; your chat and key details are still here.",
                  ),
                );
              },
              onModeChange({ mode }) {
                if (active() && voice) latest.current.onStatus(mode);
              },
              onAgentTyping(event) {
                if (!active()) return;
                if (event.is_typing) latest.current.onStatus("thinking");
                else if (!voice) latest.current.onStatus("connected");
              },
              onMessage(event) {
                if (
                  !active() ||
                  !event.message.trim() ||
                  /^[\s.…]+$/.test(event.message)
                )
                  return;
                const user = event.source === "user";
                if (user) {
                  const echo = typedMessages.current.indexOf(event.message);
                  if (echo >= 0) {
                    typedMessages.current.splice(echo, 1);
                    return;
                  }
                  finalized = event.message;
                  finalizedAt = Date.now();
                  committed = "";
                  // The finalized utterance now lives in the shared chat log.
                  latest.current.onPartialTranscript("");
                } else {
                  committed = "";
                  latest.current.onPartialTranscript("");
                }
                latest.current.onMessage(
                  user ? "user" : "assistant",
                  event.message,
                );
                if (user) latest.current.onStatus("thinking");
                else if (!voice) latest.current.onStatus("connected");
              },
            });
            const canceled = new Promise<never>((_, reject) => {
              abort.signal.addEventListener(
                "abort",
                () => reject(new DOMException("Canceled", "AbortError")),
                { once: true },
              );
              if (abort.signal.aborted)
                reject(new DOMException("Canceled", "AbortError"));
              timeout = setTimeout(
                () => reject(new Error("Connection timed out")),
                25_000,
              );
            });
            const connected = await Promise.race([connecting, canceled]);
            if (!active()) {
              void connected.endSession().catch(() => {});
              return false;
            }
            session.current = connected;
            starting.current = false;
            if (voice)
              meter.current = setInterval(() => {
                if (active())
                  latest.current.onInputLevel(
                    microphoneMuted.current ? 0 : connected.getInputVolume(),
                  );
              }, 100);
            return true;
          } catch (error) {
            if (!active()) return false;
            release();
            resetCaptions();
            latest.current.onStatus(
              "error",
              connectionError(
                error,
                voice
                  ? "Voice couldn’t connect. Check microphone permission and try again, or close voice mode to type."
                  : "Live chat couldn’t connect. Please try again.",
              ),
            );
            return false;
          } finally {
            if (timeout) clearTimeout(timeout);
          }
        },
        stop() {
          release();
          resetCaptions();
          latest.current.onTranscriptionNotice("");
          latest.current.onStatus("disconnected");
        },
        setMuted(muted) {
          const connected = session.current;
          if (!connected?.isOpen() || connected.type !== "voice") return false;
          microphoneMuted.current = muted;
          connected.setMicMuted(muted);
          if (muted) {
            speech.current?.mute();
            latest.current.onInputLevel(0);
          } else {
            speech.current?.unmute();
          }
          return true;
        },
        send(text) {
          if (!session.current?.isOpen()) return;
          typedMessages.current.push(text);
          session.current.sendUserMessage(text);
          latest.current.onStatus("thinking");
        },
      }),
      [],
    );
    return null;
  },
);
export default LiveConversation;
