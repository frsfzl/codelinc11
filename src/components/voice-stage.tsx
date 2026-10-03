"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { LoaderCircle, Mic, MicOff, X } from "lucide-react";
import type { LiveStatus } from "./live-conversation";

export function VoiceComposer({
  status,
  muted,
  words,
  inputLevel,
  error,
  notice,
  onToggleMute,
  onReconnect,
  onExit,
}: {
  status: LiveStatus;
  muted: boolean;
  words: string;
  inputLevel: number;
  error: string;
  notice: string;
  onToggleMute: () => void;
  onReconnect: () => void;
  onExit: () => void;
}) {
  const exit = useRef<HTMLButtonElement>(null);
  const captions = useRef<HTMLParagraphElement>(null);
  const connecting = status === "connecting";
  const offline = status === "disconnected" || status === "error";
  const talking = !muted && !offline && !connecting && inputLevel > 0.025;
  const inactive = muted || offline;
  const microphoneLabel = offline
    ? "Reconnect voice conversation"
    : muted
      ? "Unmute microphone"
      : "Mute microphone";
  const label = connecting
    ? "Connecting your microphone…"
    : offline
      ? "Voice is disconnected"
      : muted
        ? "Microphone muted"
        : talking
          ? "Listening to you"
          : status === "speaking"
            ? "Linc is speaking"
            : status === "thinking"
              ? "Linc is thinking…"
              : "Listening";
  useEffect(() => {
    exit.current?.focus();
  }, []);
  useEffect(() => {
    if (captions.current)
      captions.current.scrollTop = captions.current.scrollHeight;
  }, [words]);
  return (
    <div
      className={`voice-composer${talking ? " is-talking" : ""}${inactive ? " is-paused" : ""}`}
      role="group"
      aria-label="Voice message controls"
      style={
        {
          "--voice-level":
            inactive || connecting
              ? 0
              : Math.min(1, Math.max(0, inputLevel) * 4),
        } as CSSProperties
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onExit();
        }
      }}
    >
      <div className="voice-words">
        <p
          ref={captions}
          className={words ? "has-words" : ""}
          aria-label="Your live transcript"
        >
          {words ||
            (connecting
              ? "Connecting your microphone…"
              : offline
                ? "Tap the microphone to reconnect."
                : muted
                  ? "Tap the microphone to unmute."
                  : status === "speaking"
                    ? "Linc is speaking…"
                    : status === "thinking"
                      ? "Message sent. Linc is thinking…"
                      : "Speak naturally. Your words will appear here.")}
        </p>
      </div>
      <div className="voice-controls">
        <div className="voice-orb-wrap">
          <button
            type="button"
            className="voice-orb"
            disabled={connecting}
            aria-label={microphoneLabel}
            aria-pressed={muted}
            title={microphoneLabel}
            onClick={offline ? onReconnect : onToggleMute}
          >
            {connecting ? (
              <LoaderCircle className="spin" size={28} />
            ) : inactive ? (
              <MicOff size={28} strokeWidth={1.5} />
            ) : (
              <Mic size={28} strokeWidth={1.5} />
            )}
          </button>
        </div>
        <button
          ref={exit}
          className="voice-exit"
          type="button"
          aria-label="Exit voice mode and return to text"
          title="Return to typing"
          onClick={onExit}
        >
          <X size={21} />
        </button>
      </div>
      <p className="voice-state" role="status">
        {label}
      </p>
      <p className="voice-hint">
        Sends automatically when you finish speaking.
      </p>
      {error && (
        <p className="voice-notice" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="voice-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
