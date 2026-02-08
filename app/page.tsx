"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { WorryInput } from "@/components/podcast/worry-input";
import { PodcastPlayer } from "@/components/podcast/podcast-player";
import { PANELISTS, VOICE_CONFIG } from "@/lib/podcast-parser";
import { usePodcastStream } from "@/hooks/use-podcast-stream";
import { useTTS } from "@/hooks/use-tts";
import type { PodcastTurn } from "@/lib/types";

export default function Home() {
  const [worry, setWorry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const mutedIdsRef = useRef(mutedIds);
  const ttsEnabledRef = useRef(true);

  const {
    turns,
    status,
    errorMessage,
    start,
    stop: stopStream,
    reset,
  } = usePodcastStream();

  const [volume, setVolume] = useState(1);
  const { speak, speakOne, stop: stopTTS, isSpeaking, currentIndex, setVolume: setTTSVolume } = useTTS(mutedIdsRef);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    setTTSVolume(v);
  }, [setTTSVolume]);

  // Derive active speaker from TTS currentIndex (not from stream)
  const ttsSpeakerId =
    currentIndex >= 0 && currentIndex < turns.length
      ? turns[currentIndex].speakerId
      : null;

  const handleToggleMute = useCallback((id: string) => {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      mutedIdsRef.current = next;
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    async (content: string) => {
      setIsSubmitting(true);
      setWorry(content);
      ttsEnabledRef.current = true;

      const mutedArray = [...mutedIds];

      await start(content, mutedArray, (turn: PodcastTurn) => {
        if (!ttsEnabledRef.current) return;
        // Skip TTS for muted panelists (checked live via ref)
        if (mutedIdsRef.current.has(turn.speakerId)) return;
        const vc = VOICE_CONFIG[turn.speakerId] || {};
        speakOne({ text: turn.text, voiceId: vc.voiceId, rate: vc.rate, pitch: vc.pitch, speakerId: turn.speakerId });
      });

      setIsSubmitting(false);
    },
    [mutedIds, start, speakOne]
  );

  const handleStop = useCallback(() => {
    ttsEnabledRef.current = false;
    stopTTS();
  }, [stopTTS]);

  const handleNewWorry = useCallback(() => {
    ttsEnabledRef.current = false;
    stopTTS();
    stopStream();
    reset();
    setWorry("");
  }, [stopTTS, stopStream, reset]);

  const handlePlay = useCallback(() => {
    ttsEnabledRef.current = true;
    const items = turns.map((t) => {
      const vc = VOICE_CONFIG[t.speakerId] || {};
      return { text: t.text, voiceId: vc.voiceId, rate: vc.rate, pitch: vc.pitch, speakerId: t.speakerId };
    });
    speak(items);
  }, [turns, speak]);

  const isLive = status === "streaming";
  const isCompleted = status === "completed";
  const showPlayer = status !== "idle";

  if (showPlayer) {
    return (
      <div className="h-screen flex flex-col">
        <PodcastPlayer
          worry={worry}
          turns={turns}
          activeSpeakerId={ttsSpeakerId}
          isLive={isLive}
          isCompleted={isCompleted}
          mutedIds={mutedIds}
          onToggleMute={handleToggleMute}
          onNewWorry={handleNewWorry}
          isSpeaking={isSpeaking}
          ttsIndex={currentIndex}
          onPlay={handlePlay}
          onStop={handleStop}
          volume={volume}
          onVolumeChange={handleVolumeChange}
        />
        {errorMessage && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30 text-center">
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        )}
      </div>
    );
  }

  // Landing page with studio preview
  return (
    <div className="h-screen flex flex-col items-center justify-center px-4 studio-bg">
      <div className="w-full max-w-xl text-center space-y-8">
        <div className="space-y-3">
          <div className="text-5xl mb-2">📻</div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-[var(--primary)]">고민</span>뭐하니
          </h1>
          <p className="text-muted-foreground text-sm">
            AI 셀럽 패널들이 당신의 고민을 라디오 토크쇼로 풀어드립니다
          </p>
        </div>

        {/* Studio preview: panelist arc */}
        <div className="flex items-end justify-center gap-3">
          {PANELISTS.map((p, i) => {
            const isMuted = mutedIds.has(p.id);
            const arcY = [8, 0, -4, 0, 8][i] ?? 0;

            return (
              <motion.button
                key={p.id}
                onClick={() => handleToggleMute(p.id)}
                className="flex flex-col items-center gap-1.5 focus:outline-none"
                style={{ marginTop: `${arcY + 8}px` }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{ opacity: isMuted ? 0.4 : 1 }}
                title={
                  isMuted
                    ? `${p.name} 경청 모드 해제`
                    : `${p.name} 경청 모드 (발언 줄이기)`
                }
              >
                <div
                  className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                    isMuted ? "grayscale" : ""
                  }`}
                  style={{
                    borderColor: isMuted ? "#444" : p.color + "40",
                  }}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: isMuted ? "#666" : p.color }}
                >
                  {p.name}
                </span>
                {isMuted && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                    경청
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground">
          클릭하면 경청 모드 (발언 줄이기)
        </p>

        <WorryInput onSubmit={handleSubmit} isLoading={isSubmitting} />

        {errorMessage && (
          <p className="text-sm text-red-400">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
