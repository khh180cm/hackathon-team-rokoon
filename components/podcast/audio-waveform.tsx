"use client";

interface AudioWaveformProps {
  isActive: boolean;
  color: string;
}

export function AudioWaveform({ isActive, color }: AudioWaveformProps) {
  return (
    <div className="flex items-end gap-[3px] h-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-300 ${
            isActive ? `wave-bar wave-bar-${i}` : "h-1"
          }`}
          style={{
            backgroundColor: isActive ? color : color + "40",
          }}
        />
      ))}
    </div>
  );
}
