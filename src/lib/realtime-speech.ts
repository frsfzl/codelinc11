"use client";
import { Scribe, RealtimeEvents, CommitStrategy } from "@elevenlabs/client";

export interface SpeechStream {
  close: () => void;
  commit: () => void;
  mute: () => void;
  unmute: () => void;
}

export async function openSpeechStream(
  callbacks: {
    onPartial: (text: string) => void;
    onCommitted: (text: string) => void;
    onError: (message: string) => void;
  },
  signal: AbortSignal,
): Promise<SpeechStream> {
  const response = await fetch("/api/speech-token", {
    method: "POST",
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  if (!response.ok)
    throw new Error("Live transcription couldn’t connect. Please try again.");
  const { token } = await response.json();
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const connection = Scribe.connect({
      token,
      modelId: "scribe_v2_realtime",
      languageCode: "en",
      commitStrategy: CommitStrategy.VAD,
      vadSilenceThresholdSecs: 1,
      microphone: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    let ready = false;
    let closed = false;
    const timeout = setTimeout(
      () => fail("Live transcription took too long to connect."),
      15_000,
    );
    const close = () => {
      if (closed) return;
      closed = true;
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      connection.close();
    };
    const abort = () => {
      close();
      if (!ready) reject(new DOMException("Canceled", "AbortError"));
    };
    const fail = (message: string) => {
      if (closed) return;
      close();
      if (ready) callbacks.onError(message);
      else reject(new Error(message));
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    connection.on(RealtimeEvents.SESSION_STARTED, () => {
      if (closed) return;
      ready = true;
      clearTimeout(timeout);
      resolve({
        close,
        commit: () => connection.commit(),
        mute: () => connection.mute(),
        unmute: () => connection.unmute(),
      });
    });
    connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, ({ text }) => {
      if (!closed) callbacks.onPartial(text);
    });
    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, ({ text }) => {
      if (!closed) callbacks.onCommitted(text);
    });
    connection.on(RealtimeEvents.ERROR, () =>
      fail("Live transcription stopped. Please reconnect to try again."),
    );
    connection.on(RealtimeEvents.CLOSE, () =>
      fail("Live transcription disconnected. Please reconnect to try again."),
    );
  });
}
