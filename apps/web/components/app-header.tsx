"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChartNoAxesColumn, Info } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { getAvatarClass, getAvatarLabel } from "@/components/lobby-player-bubbles";

type AppHeaderProps = {
  title?: string;
  onLeftClick?: () => void;
  onRightClick?: () => void;
  rightSlot?: React.ReactNode;
  showButtons?: boolean;
  leftIcon?: "chart" | "info";
};

type StoredProfile = {
  name: string;
  avatar: string | null;
  color: string | null;
};

export function AppHeader({
  title = "7 Score",
  onLeftClick,
  onRightClick,
  rightSlot,
  showButtons = true,
  leftIcon = "chart",
}: AppHeaderProps) {
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileColor, setProfileColor] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored =
      sessionStorage.getItem("7score_profile") ??
      localStorage.getItem("7score_profile");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as StoredProfile;
      if (parsed?.name) {
        setProfileName(parsed.name);
        setProfileAvatar(parsed.avatar ?? null);
        setProfileColor(parsed.color ?? null);
      }
    } catch {
      try {
        sessionStorage.removeItem("7score_profile");
        localStorage.removeItem("7score_profile");
      } catch {
        // Ignore storage failures.
      }
    }
  }, []);

  return (
    <header className="relative flex items-center justify-between gap-4">
      {showButtons ? (
        <Button
          type="button"
          aria-label={leftIcon === "info" ? "Info" : "Leaderboard"}
          onClick={onLeftClick}
          variant="gummyBlue"
          className="h-10 w-10 p-0"
        >
          {leftIcon === "info" ? (
            <Info className="h-4 w-4" />
          ) : (
            <ChartNoAxesColumn className="h-4 w-4" />
          )}
        </Button>
      ) : (
        <div className="h-10 w-0 sm:w-10" aria-hidden />
      )}
      {profileName ? (
        <div className="pointer-events-none flex flex-1 justify-start sm:justify-center">
          <Image
            src="/assets/img/7-score-logo.png"
            alt={title}
            width={160}
            height={48}
            className="h-9 w-auto object-contain sm:h-10"
            priority
          />
        </div>
      ) : (
        <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 justify-center sm:static sm:translate-x-0 sm:flex-1">
          <Image
            src="/assets/img/7-score-logo.png"
            alt={title}
            width={160}
            height={48}
            className="h-9 w-auto object-contain sm:h-10"
            priority
          />
        </div>
      )}
      {rightSlot ? (
        rightSlot
      ) : profileName ? (
        <div
          onClick={onRightClick}
          className="flex items-center gap-2 rounded-full border-2 border-[#1f2b7a] bg-white/90 pl-3 pr-1 py-1 shadow-[0_12px_24px_rgba(31,43,122,0.2)] backdrop-blur dark:border-[#7ce7ff]/50 dark:bg-slate-950/70 sm:gap-3"
          role={onRightClick ? "button" : undefined}
          tabIndex={onRightClick ? 0 : undefined}
        >
          <div className="max-w-[120px] truncate text-xs font-semibold text-[#1f2b7a] dark:text-[#7ce7ff] sm:max-w-none sm:text-sm">
            {profileName.slice(0, 15)}
          </div>
          <div
            className={`flex items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg ${getAvatarClass(
              profileName,
              profileColor,
            )}`}
            style={{ width: 36, height: 36 }}
          >
            {getAvatarLabel(profileName, profileAvatar)}
          </div>
        </div>
      ) : (
        <div className="h-10 w-0 sm:w-10" aria-hidden />
      )}
    </header>
  );
}
