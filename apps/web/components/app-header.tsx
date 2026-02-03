"use client";

import { ChartNoAxesColumn, Info } from "lucide-react";

type AppHeaderProps = {
  title?: string;
  onLeftClick?: () => void;
  onRightClick?: () => void;
  rightSlot?: React.ReactNode;
};

export function AppHeader({
  title = "7 Score",
  onLeftClick,
  onRightClick,
  rightSlot,
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <button
        type="button"
        aria-label="Leaderboard"
        onClick={onLeftClick}
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1f2b7a] bg-white text-sm font-semibold text-[#1f2b7a] shadow-[0_10px_20px_rgba(31,43,122,0.2)] hover:bg-white/80 dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]"
      >
        <ChartNoAxesColumn className="h-4 w-4" />
      </button>
      <div className="flex flex-1 justify-center">
        <span className="text-sm font-semibold uppercase tracking-[0.35em] text-[#1f2b7a] dark:text-[#7ce7ff]">
          {/* TODO: Replace text with image logo. */}
          {title}
        </span>
      </div>
      {rightSlot ? (
        rightSlot
      ) : (
        <button
          type="button"
          aria-label="Info"
          onClick={onRightClick}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1f2b7a] bg-white text-[#1f2b7a] shadow-[0_10px_20px_rgba(31,43,122,0.2)] hover:bg-white/80 dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]"
        >
          <Info className="h-4 w-4" />
        </button>
      )}
    </header>
  );
}
