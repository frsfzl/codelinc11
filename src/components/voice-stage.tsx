"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { LoaderCircle, Mic, MicOff, X } from "lucide-react";
import type { LiveStatus } from "./live-conversation";

export type VoiceStartOrigin = {
  left: number;
  top: number;
  width: number;
  height: number;
  iconWidth: number;
};

export function VoiceComposer({
  origin = null,
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
  origin?: VoiceStartOrigin | null;
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
  const microphone = useRef<HTMLButtonElement>(null);
  const orbMotion = useRef<HTMLDivElement>(null);
  const glyph = useRef<HTMLSpanElement>(null);
  const [entering, setEntering] = useState(Boolean(origin));
  const connecting = status === "connecting";
  const offline = status === "disconnected" || status === "error";
  const talking = !muted && !offline && !connecting && inputLevel > 0.025;
  const inactive = muted || offline;
  const microphoneLabel = connecting
    ? "Connecting your microphone"
    : offline
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
  useLayoutEffect(() => {
    const motion = orbMotion.current;
    const button = microphone.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!origin || !motion || !button || reducedMotion.matches) {
      setEntering(false);
      return;
    }

    // Measure the final layout before paint, then glide from the clicked mic.
    const destination = button.getBoundingClientRect();
    const x =
      origin.left +
      origin.width / 2 -
      (destination.left + destination.width / 2);
    const y =
      origin.top +
      origin.height / 2 -
      (destination.top + destination.height / 2);
    const scale = origin.width / destination.width;
    const options: KeyframeAnimationOptions = {
      duration: 600,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    };
    setEntering(true);
    const glide = motion.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(${scale})` },
        { transform: "translate(0, 0) scale(1)" },
      ],
      options,
    );
    const iconGlide = glyph.current?.animate(
      [
        { transform: `scale(${origin.iconWidth / (28 * scale)})` },
        { transform: "scale(1)" },
      ],
      options,
    );
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      glide.cancel();
      iconGlide?.cancel();
      setEntering(false);
    };
    glide.onfinish = finish;
    window.addEventListener("resize", finish);
    reducedMotion.addEventListener("change", finish);
    return () => {
      finished = true;
      glide.cancel();
      iconGlide?.cancel();
      window.removeEventListener("resize", finish);
      reducedMotion.removeEventListener("change", finish);
    };
  }, [origin]);
  useEffect(() => {
    if (!entering) exit.current?.focus({ preventScroll: true });
  }, [entering]);
  useEffect(() => {
    if (captions.current)
      captions.current.scrollTop = captions.current.scrollHeight;
  }, [words]);
  return (
    <div
      className={`voice-composer${origin ? " has-glide" : ""}${entering ? " is-entering" : ""}${connecting ? " is-connecting" : ""}${talking ? " is-talking" : ""}${inactive ? " is-paused" : ""}`}
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
        <div className="voice-orb-wrap" ref={orbMotion}>
          <button
            ref={microphone}
            type="button"
            className="voice-orb"
            disabled={connecting || entering}
            aria-busy={connecting}
            aria-label={microphoneLabel}
            aria-pressed={muted}
            title={microphoneLabel}
            onClick={offline ? onReconnect : onToggleMute}
          >
            <span className="voice-orb-glyph" ref={glyph} aria-hidden="true">
              {entering ? (
                <Mic size={28} strokeWidth={1.7} />
              ) : connecting ? (
                <LoaderCircle className="spin" size={28} />
              ) : inactive ? (
                <MicOff size={28} strokeWidth={1.7} />
              ) : (
                <Mic size={28} strokeWidth={1.7} />
              )}
            </span>
          </button>
        </div>
        <button
          ref={exit}
          className="voice-exit"
          type="button"
          disabled={entering}
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
