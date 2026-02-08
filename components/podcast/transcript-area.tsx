"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PodcastTurn } from "@/lib/types";
import { getPanelist } from "@/lib/podcast-parser";

interface TranscriptAreaProps {
  turns: PodcastTurn[];
  activeSpeakerId: string | null;
  isStreaming: boolean;
  ttsIndex: number;
  isCompleted: boolean;
  isSpeaking: boolean;
}

export function TranscriptArea({
  turns,
  activeSpeakerId,
  isStreaming,
  ttsIndex,
  isCompleted,
  isSpeaking,
}: TranscriptAreaProps) {
  const turnRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const setTurnRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) turnRefs.current.set(index, el);
      else turnRefs.current.delete(index);
    },
    []
  );

  // Scroll to the currently playing TTS turn
  useEffect(() => {
    if (ttsIndex < 0) return;
    const el = turnRefs.current.get(ttsIndex);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [ttsIndex]);

  return (
    <div className="flex-1 overflow-auto px-4 py-4">
      <div className="max-w-2xl mx-auto space-y-2">
        <AnimatePresence initial={false}>
          {turns.map((turn, i) => {
            const panelist = getPanelist(turn.speakerId);
            if (!panelist) return null;

            const isTTSPlaying = ttsIndex === i;

            return (
              <motion.div
                key={i}
                ref={setTurnRef(i)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex items-start gap-3 py-2 px-3 rounded-xl transition-colors duration-300 ${
                  isTTSPlaying ? "bg-white/[0.03]" : ""
                }`}
                style={{
                  borderLeft: isTTSPlaying
                    ? `3px solid ${panelist.color}`
                    : "3px solid transparent",
                }}
              >
                {/* Small avatar */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border"
                  style={{
                    borderColor: panelist.color + "50",
                  }}
                >
                  <img
                    src={panelist.image}
                    alt={panelist.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: panelist.color }}
                    >
                      {panelist.name}
                    </span>
                    {panelist.role === "moderator" && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)] font-medium">
                        MC
                      </span>
                    )}
                    {isTTSPlaying && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-green-500/15 text-green-400 font-medium flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-green-400 on-air-pulse" />
                        재생 중
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {turn.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Streaming indicator when no turns yet */}
        {isStreaming && turns.length === 0 && (
          <div className="flex items-center gap-3 py-4 px-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm">🎙️</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground shimmer">
                패널들이 모이고 있어요...
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
              </div>
            </div>
          </div>
        )}

        {/* Broadcast end signal */}
        {isCompleted && turns.length > 0 && !isSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col items-center gap-2 py-6 mt-4"
          >
            <div className="w-full max-w-xs flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-muted-foreground font-medium tracking-wider">
                방송 종료
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              오늘의 고민뭐하니를 들어주셔서 감사합니다
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
