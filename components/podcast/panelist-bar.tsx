"use client";

import { PANELISTS } from "@/lib/podcast-parser";

interface PanelistBarProps {
  mutedIds?: Set<string>;
  onToggleMute?: (id: string) => void;
  interactive?: boolean;
}

export function PanelistBar({
  mutedIds,
  onToggleMute,
  interactive = false,
}: PanelistBarProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {PANELISTS.map((p) => {
        const isMuted = mutedIds?.has(p.id);
        return (
          <button
            key={p.id}
            onClick={() => interactive && onToggleMute?.(p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all
              ${interactive ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"}
              ${isMuted ? "border-red-500/30 bg-red-500/10 opacity-60" : "border-border bg-card"}`}
            title={
              interactive
                ? isMuted
                  ? `${p.name} 경청 모드 해제`
                  : `${p.name} 경청 모드 (발언 줄이기)`
                : p.shortBio
            }
          >
            <span className="text-base">{p.emoji}</span>
            <span className="font-medium" style={{ color: isMuted ? "#a1a1aa" : p.color }}>
              {p.name}
            </span>
            {isMuted && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">
                경청
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
