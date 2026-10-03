"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "permission" | "recording" | "transcribing";
const MAX_BYTES = 5 * 1024 * 1024;

export function useDictation(
  enabled: boolean,
  onTranscript: (text: string) => string | void,
) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const callback = useRef(onTranscript);
  callback.current = onTranscript;
  const generation = useRef(0);
  const busy = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);
  const dispose = useCallback(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    release();
    busy.current = false;
  }, [release]);
  useEffect(() => dispose, [dispose]);
  const cancel = useCallback(() => {
    dispose();
    setPhase("idle");
    setError("");
    setSeconds(0);
  }, [dispose]);

  function finish() {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
      release();
      setPhase("transcribing");
    }
  }

  async function start() {
    if (busy.current) return;
    setError("");
    if (!enabled) {
      setError("Speech-to-text is not connected yet. You can still type.");
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Recording isn’t supported in this browser. Try Chrome or type your message.",
      );
      return;
    }
    busy.current = true;
    const id = ++generation.current;
    setPhase("permission");
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (id !== generation.current) {
        audio.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = audio;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recording = new MediaRecorder(audio, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64_000,
      });
      recorder.current = recording;
      const chunks: Blob[] = [];
      let size = 0;
      const started = Date.now();
      recording.ondataavailable = (event) => {
        if (id !== generation.current || !event.data.size) return;
        size += event.data.size;
        if (size > MAX_BYTES) {
          cancel();
          setError("Recording is too large. Try a shorter message.");
        } else chunks.push(event.data);
      };
      recording.onerror = () => {
        if (id !== generation.current) return;
        cancel();
        setError("Recording stopped unexpectedly. Please try again.");
      };
      recording.onstop = async () => {
        if (id !== generation.current) return;
        release();
        recorder.current = null;
        setPhase("transcribing");
        try {
          if (!size || Date.now() - started < 250)
            throw new Error("That recording was too short. Please try again.");
          const file = new Blob(chunks, {
            type: recording.mimeType || mimeType || "audio/webm",
          });
          const data = new FormData();
          data.append("audio", file, "recording");
          const controller = new AbortController();
          request.current = controller;
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: data,
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(65_000),
            ]),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error || "Transcription failed. Please try again.",
            );
          if (typeof result.text !== "string" || !result.text.trim())
            throw new Error("No speech was detected. Please try again.");
          if (id !== generation.current) return;
          const notice = callback.current(result.text.trim());
          if (notice) setError(notice);
        } catch (error) {
          if (id === generation.current)
            setError(
              error instanceof Error &&
                error.name !== "TimeoutError" &&
                error.name !== "TypeError"
                ? error.message
                : "Transcription couldn’t finish. Please try again or type your message.",
            );
        } finally {
          if (id === generation.current) {
            busy.current = false;
            request.current = null;
            setPhase("idle");
          }
        }
      };
      recording.start(250);
      setSeconds(0);
      setPhase("recording");
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(Math.min(60, elapsed));
        if (elapsed >= 60) finish();
      }, 250);
    } catch (error) {
      if (id !== generation.current) return;
      release();
      busy.current = false;
      setPhase("idle");
      setError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access was denied. Allow it in your browser or keep typing."
          : "We couldn’t access your microphone. Check that it’s available, or keep typing.",
      );
    }
  }
  return {
    phase,
    seconds,
    error,
    busy: phase !== "idle",
    start,
    finish,
    cancel,
    clearError: () => setError(""),
  };
}
