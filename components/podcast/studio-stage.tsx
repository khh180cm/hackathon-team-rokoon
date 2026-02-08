"use client";

import { motion } from "framer-motion";
import { PANELISTS } from "@/lib/podcast-parser";
import { AudioWaveform } from "./audio-waveform";

interface StudioStageProps {
  activeSpeakerId: string | null;
  mutedIds: Set<string>;
  onToggleMute: (id: string) => void;
  isLive: boolean;
  isSpeaking: boolean;
}

export function StudioStage({
  activeSpeakerId,
  mutedIds,
  onToggleMute,
  isLive,
  isSpeaking,
}: StudioStageProps) {
  return (
    <div className="relative flex items-center justify-center py-6 px-4">
      {/* Background glow for active speaker */}
      {activeSpeakerId && (
        <motion.div
          key={activeSpeakerId}
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: `radial-gradient(ellipse at center, ${
              PANELISTS.find((p) => p.id === activeSpeakerId)?.color ?? "#F59E0B"
            }10 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Panelist avatars in arc */}
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {PANELISTS.map((p, i) => {
          const isActive = p.id === activeSpeakerId;
          const isMuted = mutedIds.has(p.id);

          // Arc positioning: middle items slightly higher
          const arcY = [8, 0, -4, 0, 8][i] ?? 0;

          return (
            <motion.button
              key={p.id}
              onClick={() => onToggleMute(p.id)}
              className="flex flex-col items-center gap-1.5 relative focus:outline-none"
              style={{ marginTop: `${arcY + 8}px` }}
              animate={{
                scale: isActive ? 1.25 : 1,
                opacity: isMuted ? 0.4 : isActive ? 1 : 0.65,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              title={
                isMuted
                  ? `${p.name} 경청 모드 해제`
                  : `${p.name} 경청 모드`
              }
            >
              {/* Glow ring */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 -m-1.5 rounded-full"
                  style={{
                    boxShadow: `0 0 20px 6px ${p.color}40, 0 0 40px 12px ${p.color}20`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Avatar */}
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 transition-colors duration-300 ${
                  isMuted ? "grayscale" : ""
                }`}
                style={{
                  borderColor: isActive ? p.color : p.color + "40",
                }}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Waveform (when TTS is playing this speaker) */}
              {isActive && (isLive || isSpeaking) && (
                <AudioWaveform isActive color={p.color} />
              )}

              {/* Name */}
              <span
                className="text-[11px] font-medium whitespace-nowrap"
                style={{
                  color: isActive ? p.color : isMuted ? "#666" : "#999",
                }}
              >
                {p.name}
              </span>

              {/* Role badge */}
              {p.role === "moderator" && !isMuted && (
                <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)] font-bold">
                  MC
                </span>
              )}

              {/* Muted badge */}
              {isMuted && (
                <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                  경청
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
