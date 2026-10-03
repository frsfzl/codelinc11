"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { LoaderCircle, Mic, Pause, Play, X } from "lucide-react";
import { LincAvatar } from "./linc-avatar";
import type { LiveStatus } from "./live-conversation";

export function VoiceStage({
  status,
  paused,
  words,
  inputLevel,
  reply,
  error,
  notice,
  onPause,
  onResume,
  onExit,
}: {
  status: LiveStatus;
  paused: boolean;
  words: string;
  inputLevel: number;
  reply?: string;
  error: string;
  notice: string;
  onPause: () => void;
  onResume: () => void;
  onExit: () => void;
}) {
  const exit = useRef<HTMLButtonElement>(null);
  const captions = useRef<HTMLParagraphElement>(null);
  const connecting = status === "connecting";
  const offline = status === "disconnected" || status === "error";
  const talking = !paused && !offline && !connecting && inputLevel > 0.025;
  const label = paused
    ? "Paused · microphone off"
    : connecting
      ? "Connecting your microphone…"
      : offline
        ? "Voice is disconnected"
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
      className={`voice-stage${talking ? " is-talking" : ""}${paused ? " is-paused" : ""}`}
      style={
        {
          "--voice-level": Math.min(1, Math.max(0, inputLevel) * 4),
        } as CSSProperties
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onExit();
        }
      }}
    >
      <div className="voice-stage-top">
        <span>VOICE WITH LINC</span>
        <button
          ref={exit}
          className="voice-exit"
          type="button"
          aria-label="Exit voice mode and return to text"
          onClick={onExit}
        >
          <X size={21} />
        </button>
      </div>
      <div className="voice-stage-content">
        <div className="voice-reply" aria-live="polite">
          {reply && (
            <>
              <LincAvatar />
              <p>{reply}</p>
            </>
          )}
        </div>
        <div className="voice-orb-wrap">
          <button
            type="button"
            className="voice-orb"
            disabled={connecting}
            aria-label={
              paused || offline
                ? "Resume voice conversation"
                : "Pause voice conversation"
            }
            onClick={paused || offline ? onResume : onPause}
          >
            {connecting ? (
              <LoaderCircle className="spin" size={38} />
            ) : (
              <Mic size={38} strokeWidth={1.5} />
            )}
          </button>
        </div>
        <p className="voice-state" role="status">
          {label}
        </p>
        <div className="voice-words">
          <p
            ref={captions}
            className={words ? "has-words" : ""}
            aria-label="Your live transcript"
          >
            {words ||
              (paused
                ? "Your conversation is saved here."
                : connecting
                  ? "One moment…"
                  : offline
                    ? "Reconnect whenever you’re ready."
                    : "Your words will appear here as you speak.")}
          </p>
        </div>
      </div>
      <div className="voice-stage-bottom">
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
        <button
          className="voice-pause"
          type="button"
          disabled={connecting}
          onClick={paused || offline ? onResume : onPause}
        >
          {paused || offline ? <Play size={15} /> : <Pause size={15} />}
          {paused
            ? "Resume conversation"
            : offline
              ? "Reconnect"
              : "Pause conversation"}
        </button>
        <p>Responds automatically when you finish speaking.</p>
      </div>
    </div>
  );
}
