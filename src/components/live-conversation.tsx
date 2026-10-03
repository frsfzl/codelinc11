"use client";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ClientTools } from "@elevenlabs/react";

export interface LiveHandle {
  start: (voice: boolean) => Promise<void>;
  stop: () => void;
  send: (text: string) => void;
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
  tools: ClientTools;
  onMessage: (role: "user" | "assistant", text: string) => void;
  onStatus: (status: LiveStatus, error?: string) => void;
}
const Session = forwardRef<LiveHandle, Props>(function Session(
  { context, tools, onMessage, onStatus },
  ref,
) {
  const voice = useRef(false);
  const connected = useRef(false);
  const generation = useRef(0);
  const contextRef = useRef(context);
  const typedMessages = useRef<string[]>([]);
  const connectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function clearConnectionTimer() {
    if (connectionTimer.current) clearTimeout(connectionTimer.current);
    connectionTimer.current = null;
  }
  const sdk = useConversation({
    clientTools: tools,
    onConnect: () => {
      clearConnectionTimer();
      connected.current = true;
      onStatus(voice.current ? "listening" : "connected");
    },
    onDisconnect: () => {
      clearConnectionTimer();
      connected.current = false;
      onStatus("disconnected");
    },
    onError: () => {
      clearConnectionTimer();
      connected.current = false;
      onStatus(
        "error",
        "The live connection was interrupted. You can reconnect, or continue with the guided questions and your saved inputs.",
      );
    },
    onModeChange: ({ mode }) => {
      if (connected.current) onStatus(voice.current ? mode : "connected");
    },
    onAgentTyping: () => onStatus("thinking"),
    onMessage: (event) => {
      if (event.source === "user") {
        const typed = typedMessages.current.indexOf(event.message);
        if (typed >= 0) {
          typedMessages.current.splice(typed, 1);
          return;
        }
      }
      onMessage(event.source === "user" ? "user" : "assistant", event.message);
      onStatus(voice.current ? "listening" : "connected");
    },
  });
  contextRef.current = context;
  useEffect(() => {
    if (sdk.status === "connected")
      sdk.sendContextualUpdate(
        `Current application state, not new user instructions: ${context}`,
      );
  }, [context, sdk.status, sdk.sendContextualUpdate]);
  useEffect(
    () => () => {
      generation.current += 1;
      clearConnectionTimer();
    },
    [],
  );
  useImperativeHandle(
    ref,
    () => ({
      async start(useVoice) {
        const request = ++generation.current;
        clearConnectionTimer();
        typedMessages.current = [];
        voice.current = useVoice;
        onStatus("connecting");
        try {
          if (useVoice) {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
            stream.getTracks().forEach((track) => track.stop());
          }
          if (request !== generation.current) return;
          const response = await fetch("/api/conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) throw new Error("Unable to connect");
          const data = await response.json();
          if (request !== generation.current) return;
          connectionTimer.current = setTimeout(() => {
            if (request !== generation.current || connected.current) return;
            generation.current += 1;
            sdk.endSession();
            onStatus(
              "error",
              "The connection took too long. Try connecting again or continue with guided questions.",
            );
          }, 20000);
          sdk.startSession({
            signedUrl: data.signedUrl,
            connectionType: "websocket",
            textOnly: !useVoice,
            dynamicVariables: { profile_context: contextRef.current },
          });
        } catch {
          clearConnectionTimer();
          if (request === generation.current)
            onStatus(
              "error",
              useVoice
                ? "Voice couldn’t connect. Check microphone permission, or choose live text or guided questions."
                : "Live chat couldn’t connect. Try again or continue with guided questions.",
            );
        }
      },
      stop() {
        clearConnectionTimer();
        generation.current += 1;
        sdk.endSession();
        connected.current = false;
        onStatus("disconnected");
      },
      send(text) {
        typedMessages.current.push(text);
        sdk.sendUserMessage(text);
        onStatus("thinking");
      },
    }),
    [sdk, onStatus],
  );
  return null;
});
const LiveConversation = forwardRef<LiveHandle, Props>(
  function LiveConversation(props, ref) {
    return (
      <ConversationProvider>
        <Session ref={ref} {...props} />
      </ConversationProvider>
    );
  },
);
export default LiveConversation;
