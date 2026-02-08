"use client";

import { useState, useRef } from "react";

interface WorryInputProps {
  onSubmit: (worry: string) => void;
  isLoading: boolean;
}

export function WorryInput({ onSubmit, isLoading }: WorryInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative rounded-2xl border border-border bg-card overflow-hidden focus-within:border-[var(--primary)]/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="여기에 고민을 적어주세요..."
          disabled={isLoading}
          rows={3}
          className="w-full bg-transparent px-4 pt-4 pb-14 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none disabled:opacity-50"
        />
        <div className="absolute bottom-3 right-3">
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all
                       bg-[var(--primary)] text-[var(--primary-foreground)]
                       hover:brightness-110
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? "보내는 중..." : "사연 보내기"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        AI 셀럽 패널들이 당신의 고민에 진심으로 답해드립니다
      </p>
    </div>
  );
}
