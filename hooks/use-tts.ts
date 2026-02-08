"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface TTSItem {
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  speakerId?: string;
}

/**
 * TTS hook — ElevenLabs via /api/tts with single look-ahead prefetch.
 * Falls back to browser SpeechSynthesis when voiceId is absent or API fails.
 */
export function useTTS(mutedIdsRef?: React.RefObject<Set<string>>) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const queueRef = useRef<TTSItem[]>([]);
  const indexRef = useRef(0);
  const activeRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const volumeRef = useRef(1);

  // Single look-ahead: prefetch cache for next item only
  const prefetchCache = useRef<Map<number, Promise<string | null>>>(new Map());

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const fetchTTS = useCallback(
    async (item: TTSItem): Promise<string | null> => {
      if (!item.voiceId) return null;
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: item.text, voiceId: item.voiceId }),
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    },
    []
  );

  // Prefetch exactly one item if not already fetching
  const prefetchOne = useCallback(
    (idx: number) => {
      if (prefetchCache.current.has(idx)) return;
      const item = queueRef.current[idx];
      if (!item?.voiceId) return;
      prefetchCache.current.set(idx, fetchTTS(item));
    },
    [fetchTTS]
  );

  const playBrowserTTS = useCallback(
    (item: TTSItem, onDone: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        onDone();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = "ko-KR";
      utterance.rate = item.rate ?? 1.05;
      utterance.pitch = item.pitch ?? 1;
      const voices = speechSynthesis.getVoices();
      const koVoice = voices.find((v) => v.lang.startsWith("ko"));
      if (koVoice) utterance.voice = koVoice;
      utterance.onend = onDone;
      utterance.onerror = onDone;
      speechSynthesis.speak(utterance);
    },
    []
  );

  const playUrl = useCallback(
    (url: string, onDone: () => void) => {
      cleanupAudio();
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audio.volume = volumeRef.current;
      audioRef.current = audio;

      let done = false;
      const finish = () => {
        if (done) return; // prevent double-advance
        done = true;
        onDone();
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    },
    [cleanupAudio]
  );

  const playNext = useCallback(() => {
    if (!activeRef.current || indexRef.current >= queueRef.current.length) {
      activeRef.current = false;
      setIsSpeaking(false);
      setCurrentIndex(-1);
      cleanupAudio();
      return;
    }

    const idx = indexRef.current;
    const item = queueRef.current[idx];
    setCurrentIndex(idx);

    const advance = () => {
      prefetchCache.current.delete(idx);
      indexRef.current++;
      playNext();
    };

    // Skip muted speakers (checked at playback time, not queue time)
    if (item.speakerId && mutedIdsRef?.current?.has(item.speakerId)) {
      advance();
      return;
    }

    // Kick off prefetch for the next item while we handle current
    if (idx + 1 < queueRef.current.length) {
      prefetchOne(idx + 1);
    }

    if (!item.voiceId) {
      playBrowserTTS(item, advance);
      return;
    }

    // Use cached promise if available, otherwise create new fetch
    const promise = prefetchCache.current.get(idx) || fetchTTS(item);
    prefetchCache.current.set(idx, promise);

    promise.then((url) => {
      if (!activeRef.current) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      if (url) {
        playUrl(url, advance);
      } else {
        // ElevenLabs failed, fallback to browser TTS
        playBrowserTTS(item, advance);
      }
    });
  }, [cleanupAudio, fetchTTS, prefetchOne, playUrl, playBrowserTTS]);

  const speak = useCallback(
    (items: TTSItem[]) => {
      cleanupAudio();
      if (typeof window !== "undefined") speechSynthesis?.cancel();
      // Clear old cache
      prefetchCache.current.clear();
      queueRef.current = items;
      indexRef.current = 0;
      activeRef.current = true;
      setIsSpeaking(true);
      playNext();
    },
    [playNext, cleanupAudio]
  );

  const speakOne = useCallback(
    (item: TTSItem) => {
      const idx = queueRef.current.length;
      queueRef.current.push(item);
      // Prefetch immediately on arrival so audio is ready when playNext reaches it
      prefetchOne(idx);
      if (!activeRef.current) {
        activeRef.current = true;
        setIsSpeaking(true);
        playNext();
      }
    },
    [playNext, prefetchOne]
  );

  const stop = useCallback(() => {
    activeRef.current = false;
    cleanupAudio();
    if (typeof window !== "undefined") speechSynthesis?.cancel();
    prefetchCache.current.clear();
    setIsSpeaking(false);
    setCurrentIndex(-1);
  }, [cleanupAudio]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      cleanupAudio();
      if (typeof window !== "undefined") speechSynthesis?.cancel();
    };
  }, [cleanupAudio]);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  return { speak, speakOne, stop, isSpeaking, currentIndex, setVolume };
}
