"use client";

import Image from "next/image";
import { ChartNoAxesColumn, Info } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

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
    <header className="relative flex items-center justify-between gap-4">
      <Button
        type="button"
        aria-label="Leaderboard"
        onClick={onLeftClick}
        variant="gummyBlue"
        className="h-10 w-10 p-0"
      >
        <ChartNoAxesColumn className="h-4 w-4" />
      </Button>
      <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 justify-center">
        <Image
          src="/assets/img/7-score-logo.png"
          alt={title}
          width={160}
          height={48}
          className="h-8 w-auto object-contain"
          priority
        />
      </div>
      {rightSlot ? (
        rightSlot
      ) : (
        <Button
          type="button"
          aria-label="Info"
          onClick={onRightClick}
          variant="gummyBlue"
          className="h-10 w-10 p-0"
        >
          <Info className="h-4 w-4" />
        </Button>
      )}
    </header>
  );
}
