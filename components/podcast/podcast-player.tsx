"use client";

import type { PodcastTurn } from "@/lib/types";
import { OnAirIndicator } from "./on-air-indicator";
import { StudioStage } from "./studio-stage";
import { TranscriptArea } from "./transcript-area";

interface PodcastPlayerProps {
  worry: string;
  turns: PodcastTurn[];
  activeSpeakerId: string | null;
  isLive: boolean;
  isCompleted: boolean;
  mutedIds: Set<string>;
  onToggleMute: (id: string) => void;
  onNewWorry: () => void;
  isSpeaking: boolean;
  ttsIndex: number;
  onPlay: () => void;
  onStop: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}

export function PodcastPlayer({
  worry,
  turns,
  activeSpeakerId,
  isLive,
  isCompleted,
  mutedIds,
  onToggleMute,
  onNewWorry,
  isSpeaking,
  ttsIndex,
  onPlay,
  onStop,
  volume,
  onVolumeChange,
}: PodcastPlayerProps) {
  return (
    <div className="flex flex-col h-full studio-bg">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/[0.06] px-4 py-3 bg-black/20 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">📻</span>
            <div>
              <h1 className="text-sm font-bold text-[var(--primary)]">
                고민뭐하니
              </h1>
              <p className="text-[10px] text-muted-foreground">
                AI 셀럽 고민 상담 라디오
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {turns.length > 0 && (
              <button
                onClick={isSpeaking ? onStop : onPlay}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSpeaking
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                }`}
              >
                {isSpeaking ? "⏹ 정지" : "▶ 들어보기"}
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 accent-[var(--primary)] cursor-pointer"
              />
            </div>
            <OnAirIndicator isLive={isLive} />
          </div>
        </div>
      </header>

      {/* Worry banner */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-black/10">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-lg border border-[var(--primary)]/15 bg-[var(--primary)]/[0.04] px-4 py-2.5">
            <p className="text-[10px] text-[var(--primary)] font-medium mb-0.5 uppercase tracking-wider">
              오늘의 사연
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2">
              {worry}
            </p>
          </div>
        </div>
      </div>

      {/* Studio Stage — top section */}
      <div className="flex-shrink-0 border-b border-white/[0.04]">
        <div className="max-w-2xl mx-auto">
          <StudioStage
            activeSpeakerId={activeSpeakerId}
            mutedIds={mutedIds}
            onToggleMute={onToggleMute}
            isLive={isLive}
            isSpeaking={isSpeaking}
          />
        </div>
      </div>

      {/* Transcript — scrollable bottom section */}
      <TranscriptArea
        turns={turns}
        activeSpeakerId={activeSpeakerId}
        isStreaming={isLive}
        ttsIndex={ttsIndex}
        isCompleted={isCompleted}
        isSpeaking={isSpeaking}
      />

      {/* Footer — show when completed */}
      {isCompleted && turns.length > 0 && (
        <div className="flex-shrink-0 border-t border-white/[0.06] px-4 py-4 bg-black/20 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
            {!isSpeaking && (
              <button
                onClick={onPlay}
                className="px-4 py-2 rounded-xl text-sm font-semibold
                           bg-green-500/15 text-green-400 border border-green-500/25
                           hover:bg-green-500/25 transition-all"
              >
                ▶ 다시 들어보기
              </button>
            )}
            <button
              onClick={() => {
                onStop();
                onNewWorry();
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold
                         bg-[var(--primary)] text-[var(--primary-foreground)]
                         hover:brightness-110 transition-all"
            >
              새 고민 보내기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
