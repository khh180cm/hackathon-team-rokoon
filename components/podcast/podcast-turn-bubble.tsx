"use client";

import { useState, useEffect } from "react";
import type { Panelist, PodcastTurn } from "@/lib/types";
import { REACTIONS } from "@/lib/podcast-parser";

interface PodcastTurnBubbleProps {
  turn: PodcastTurn;
  panelist: Panelist;
  index: number;
  isSpeaking?: boolean;
  isMuted?: boolean;
  onClickMute?: () => void;
}

export function PodcastTurnBubble({
  turn,
  panelist,
  index,
  isSpeaking = false,
  isMuted = false,
  onClickMute,
}: PodcastTurnBubbleProps) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(isMuted);

  // Show a floating reaction when the bubble first appears
  useEffect(() => {
    const reactions = REACTIONS[panelist.id] || ["👏"];
    const r = reactions[Math.floor(Math.random() * reactions.length)];
    setReaction(r);
    const timer = setTimeout(() => setReaction(null), 1800);
    return () => clearTimeout(timer);
  }, [panelist.id]);

  useEffect(() => {
    setCollapsed(isMuted);
  }, [isMuted]);

  const isModerator = panelist.role === "moderator";

  return (
    <div
      className="animate-fade-slide-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`flex items-start gap-3 ${collapsed ? "panelist-muted" : ""}`}>
        {/* Avatar */}
        <button
          onClick={onClickMute}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all
            ${isSpeaking ? "speaking-glow" : ""}
            ${onClickMute ? "cursor-pointer hover:scale-110 active:scale-95" : ""}`}
          style={{
            borderColor: panelist.color,
            backgroundColor: panelist.color + "15",
          }}
          title={onClickMute ? `${panelist.name} 경청 모드 토글` : undefined}
        >
          {panelist.emoji}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 relative">
          {/* Floating reaction */}
          {reaction && (
            <span className="absolute -top-2 right-2 text-lg animate-float-up pointer-events-none">
              {reaction}
            </span>
          )}

          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-sm font-semibold"
              style={{ color: panelist.color }}
            >
              {panelist.name}
            </span>
            {isModerator && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)] font-medium">
                MC
              </span>
            )}
            {isSpeaking && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 on-air-pulse" />
                재생 중
              </span>
            )}
          </div>

          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              (경청 중... 클릭하면 펼치기)
            </button>
          ) : (
            <div
              className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed border transition-all
                ${isSpeaking ? "ring-2 ring-offset-1 ring-offset-background" : ""}`}
              style={{
                borderColor: isSpeaking ? panelist.color : panelist.color + "30",
                backgroundColor: panelist.color + "08",
              }}
            >
              {turn.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
