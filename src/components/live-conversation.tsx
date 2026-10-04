"use client";
import { TextConversation, type ClientToolsConfig } from "@elevenlabs/client";
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
    const session = useRef<TextConversation | null>(null);
    const speech = useRef<SpeechStream | null>(null);
    const controller = useRef<AbortController | null>(null);
    const generation = useRef(0);
    const starting = useRef(false);
    const meter = useRef<ReturnType<typeof setInterval> | null>(null);
    const meterStream = useRef<MediaStream | null>(null);
    const meterContext = useRef<AudioContext | null>(null);
    const sentMessages = useRef<string[]>([]);
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
      meterStream.current?.getTracks().forEach((track) => track.stop());
      meterStream.current = null;
      void meterContext.current?.close().catch(() => {});
      meterContext.current = null;
      const previous = session.current;
      session.current = null;
      if (previous) void previous.endSession().catch(() => {});
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
          sentMessages.current = [];
          latest.current.onStatus("connecting");
          let timeout: ReturnType<typeof setTimeout> | undefined;
          try {
            if (voice) {
              const permission = await navigator.mediaDevices.getUserMedia({
                audio: true,
              });
              if (!active()) {
                permission.getTracks().forEach((track) => track.stop());
                return false;
              }
              meterStream.current = permission;
              // Input analysis only: nothing is connected to the speakers.
              const context = new AudioContext();
              meterContext.current = context;
              const analyser = context.createAnalyser();
              analyser.fftSize = 256;
              context.createMediaStreamSource(permission).connect(analyser);
              const samples = new Float32Array(analyser.fftSize);
              void context.resume().catch(() => {});
              meter.current = setInterval(() => {
                if (!active()) return;
                analyser.getFloatTimeDomainData(samples);
                const energy = samples.reduce(
                  (sum, value) => sum + value * value,
                  0,
                );
                latest.current.onInputLevel(
                  microphoneMuted.current
                    ? 0
                    : Math.min(1, Math.sqrt(energy / samples.length) * 5),
                );
              }, 100);
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
            // Dictation sends transcribed text. The agent never opens an audio session.
            const connecting = TextConversation.startSession({
              signedUrl,
              connectionType: "websocket",
              textOnly: true,
              clientTools,
              dynamicVariables: {
                profile_context: JSON.stringify({
                  ...state,
                  conversationHistory: history,
                }),
                opening_message: opening,
              },
              onConversationCreated(conversation) {
                if (active() && conversation.type === "text")
                  session.current = conversation;
                else {
                  void conversation.endSession().catch(() => {});
                }
              },
              onConnect() {
                if (active())
                  latest.current.onStatus(voice ? "connecting" : "connected");
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
              onAgentTyping(event) {
                if (!active()) return;
                if (event.is_typing) latest.current.onStatus("thinking");
                else if (!starting.current)
                  latest.current.onStatus(voice ? "listening" : "connected");
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
                  const echo = sentMessages.current.indexOf(event.message);
                  if (echo >= 0) {
                    sentMessages.current.splice(echo, 1);
                    return;
                  }
                }
                latest.current.onMessage(
                  user ? "user" : "assistant",
                  event.message,
                );
                if (user) latest.current.onStatus("thinking");
                else if (!starting.current)
                  latest.current.onStatus(voice ? "listening" : "connected");
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
            if (timeout) clearTimeout(timeout);
            if (voice) {
              const stream = await openSpeechStream(
                {
                  onPartial(text) {
                    if (!active() || microphoneMuted.current) return;
                    latest.current.onPartialTranscript(text);
                  },
                  onCommitted(transcript) {
                    const text = transcript.trim();
                    if (
                      !active() ||
                      microphoneMuted.current ||
                      !text ||
                      /^[\s.…]+$/.test(text)
                    )
                      return;
                    // Scribe's committed segment is the only spoken user turn.
                    // Ignore its eventual text-session echo to avoid duplicates.
                    sentMessages.current.push(text);
                    sentMessages.current = sentMessages.current.slice(-64);
                    latest.current.onMessage("user", text);
                    latest.current.onPartialTranscript("");
                    connected.sendUserMessage(text);
                    latest.current.onStatus("thinking");
                  },
                  onError(message) {
                    if (!active()) return;
                    release();
                    resetCaptions();
                    latest.current.onStatus("error", message);
                  },
                },
                abort.signal,
              );
              if (!active()) {
                stream.close();
                return false;
              }
              speech.current = stream;
            }
            starting.current = false;
            latest.current.onStatus(voice ? "listening" : "connected");
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
          if (!connected?.isOpen() || !speech.current) return false;
          microphoneMuted.current = muted;
          meterStream.current?.getAudioTracks().forEach((track) => {
            track.enabled = !muted;
          });
          if (muted) {
            speech.current?.mute();
            latest.current.onPartialTranscript("");
            latest.current.onInputLevel(0);
          } else {
            speech.current?.unmute();
          }
          return true;
        },
        send(text) {
          if (!session.current?.isOpen()) return;
          sentMessages.current.push(text);
          sentMessages.current = sentMessages.current.slice(-64);
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
