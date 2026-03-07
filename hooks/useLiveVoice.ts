"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  LiveAPIClient,
  startMicCapture,
  type ConnectionState,
  type MicController,
} from "@/lib/live-api";

export interface UseLiveVoiceResult {
  /** Current connection state machine value */
  connectionState: ConnectionState;
  /** Convenience booleans */
  isConnected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  /** Start a voice session — requests mic permission and connects to Live API */
  connect: () => Promise<void>;
  /** End the voice session */
  disconnect: () => void;
  /** Push scene analysis text so the AI knows what the camera sees */
  updateContext: (text: string) => void;
  /** Mutable ref — page.tsx sets this to wire voice-triggered analysis */
  onAnalysisRequested: React.MutableRefObject<(() => void) | null>;
}

export function useLiveVoice(): UseLiveVoiceResult {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("DISCONNECTED");

  const clientRef = useRef<LiveAPIClient | null>(null);
  const micRef = useRef<MicController | null>(null);
  const analysisCallbackRef = useRef<(() => void) | null>(null);

  // Stable error handler
  const handleError = useCallback((err: Error) => {
    console.error("[useLiveVoice]", err.message);
  }, []);

  const connect = useCallback(async () => {
    // Prevent double-connect
    if (clientRef.current) return;

    const client = new LiveAPIClient({
      onStateChange: (state) => setConnectionState(state),
      onError: handleError,
      onAnalysisRequested: () => {
        analysisCallbackRef.current?.();
      },
    });
    clientRef.current = client;

    // Connect to Live API first
    await client.connect();

    // Start mic capture and pipe audio chunks to the Live API
    try {
      const mic = await startMicCapture((base64Pcm) => {
        client.sendAudio(base64Pcm);
      });
      micRef.current = mic;
    } catch (err) {
      console.error("[useLiveVoice] Mic capture failed:", err);
      client.disconnect();
      clientRef.current = null;
    }
  }, [handleError]);

  const disconnect = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;

    clientRef.current?.disconnect();
    clientRef.current = null;

    setConnectionState("DISCONNECTED");
  }, []);

  const updateContext = useCallback((text: string) => {
    clientRef.current?.updateContext(text);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      micRef.current?.stop();
      micRef.current = null;
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  return {
    connectionState,
    isConnected: connectionState !== "DISCONNECTED" && connectionState !== "CONNECTING",
    isSpeaking: connectionState === "SPEAKING",
    isListening: connectionState === "LISTENING",
    connect,
    disconnect,
    updateContext,
    onAnalysisRequested: analysisCallbackRef,
  };
}
