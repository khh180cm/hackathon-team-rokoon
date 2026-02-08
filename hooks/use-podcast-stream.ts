"use client";

import { useState, useCallback, useRef } from "react";
import type { PodcastTurn } from "@/lib/types";

export type StreamStatus = "idle" | "streaming" | "completed" | "error";

interface StreamTurnEvent {
  type: "turn";
  speakerId: string;
  index: number;
  text: string;
}

export function usePodcastStream() {
  const [turns, setTurns] = useState<PodcastTurn[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onTurnCompleteRef = useRef<((turn: PodcastTurn) => void) | null>(null);

  const start = useCallback(
    async (
      worry: string,
      mutedIds: string[],
      onTurnComplete?: (turn: PodcastTurn) => void
    ) => {
      // Clean up previous stream
      abortRef.current?.abort();

      setTurns([]);
      setStatus("streaming");
      setActiveSpeakerId(null);
      setErrorMessage(null);
      onTurnCompleteRef.current = onTurnComplete ?? null;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/podcast/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worry, mutedIds }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No readable stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = "";
          let eventType = "";

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);

                if (eventType === "turn") {
                  const turnEvent = data as StreamTurnEvent;
                  const newTurn: PodcastTurn = {
                    speakerId: turnEvent.speakerId,
                    text: turnEvent.text,
                  };
                  setTurns((prev) => [...prev, newTurn]);
                  setActiveSpeakerId(turnEvent.speakerId);
                  // Notify for TTS
                  onTurnCompleteRef.current?.(newTurn);
                } else if (eventType === "done") {
                  setStatus("completed");
                  setActiveSpeakerId(null);
                } else if (eventType === "error") {
                  setStatus("error");
                  setErrorMessage(data.error || "Stream failed");
                }
              } catch {
                // Incomplete JSON, keep in buffer
                buffer = lines.slice(i).join("\n");
                break;
              }
              eventType = "";
            } else if (line === "") {
              // Empty line = event boundary, reset
              eventType = "";
            } else {
              // Incomplete line, keep for next chunk
              buffer = lines.slice(i).join("\n");
              break;
            }
          }
        }

        // If we reach here without a done event, mark as completed
        setStatus((prev) => (prev === "streaming" ? "completed" : prev));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Stream error:", err);
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Unknown error"
        );
      }
    },
    []
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus((prev) => (prev === "streaming" ? "completed" : prev));
    setActiveSpeakerId(null);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setTurns([]);
    setStatus("idle");
    setActiveSpeakerId(null);
    setErrorMessage(null);
  }, []);

  return {
    turns,
    status,
    activeSpeakerId,
    errorMessage,
    start,
    stop,
    reset,
  };
}
