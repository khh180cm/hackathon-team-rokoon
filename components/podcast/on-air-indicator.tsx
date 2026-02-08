"use client";

export function OnAirIndicator({ isLive }: { isLive: boolean }) {
  if (!isLive) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
      <div className="w-2 h-2 rounded-full bg-red-500 on-air-pulse" />
      <span className="text-xs font-bold tracking-widest text-red-400 uppercase">
        ON AIR
      </span>
      <div className="flex items-end gap-0.5 h-4">
        <div className="w-0.5 bg-red-400 rounded-full eq-bar-1" />
        <div className="w-0.5 bg-red-400 rounded-full eq-bar-2" />
        <div className="w-0.5 bg-red-400 rounded-full eq-bar-3" />
      </div>
    </div>
  );
}
