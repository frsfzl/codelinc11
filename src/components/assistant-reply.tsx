"use client";

import { useEffect, useState } from "react";

// Presentation pacing for the demo; the complete reply stays in conversation state.
const THINKING_DELAY_MS = 750;
const REVEAL_INTERVAL_MS = 65;
const WORDS_PER_FRAME = 3;

export function ThinkingIndicator() {
  return (
    <span className="reply-thinking" role="status">
      <span className="reply-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      Linc is thinking…
    </span>
  );
}

export function AssistantReply({ text: response }: { text: string }) {
  const text = response.replace(/\s*\u2014\s*/g, ", ");
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    setVisibleText("");
    const words = text.match(/\S+\s*/g) ?? [text];
    let count = 0;
    let frame: ReturnType<typeof setTimeout> | undefined;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const reveal = () => {
      count = reducedMotion ? words.length : count + WORDS_PER_FRAME;
      setVisibleText(
        count >= words.length ? text : words.slice(0, count).join(""),
      );
      if (count < words.length) frame = setTimeout(reveal, REVEAL_INTERVAL_MS);
    };
    const delay = setTimeout(reveal, THINKING_DELAY_MS);
    return () => {
      clearTimeout(delay);
      if (frame) clearTimeout(frame);
    };
  }, [text]);

  return (
    <div className="assistant-reply" aria-busy={visibleText !== text}>
      {visibleText ? (
        <p className={visibleText !== text ? "reply-revealing" : undefined}>
          {visibleText}
        </p>
      ) : (
        <ThinkingIndicator />
      )}
    </div>
  );
}
