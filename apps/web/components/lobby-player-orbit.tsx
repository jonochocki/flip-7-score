"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as motion from "motion/react-client";
import { Pencil, UserX } from "lucide-react";
import {
  computeLobbyLayout,
  type LayoutMode,
} from "@/components/lobby-orbit-layout";
import { getAvatarClass, getAvatarLabel } from "@/components/lobby-player-bubbles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";

type Player = {
  id: string;
  name: string;
  avatar?: string | null;
  color?: string | null;
};

type LobbyPlayerOrbitProps = {
  players: Player[];
  currentPlayerId: string;
  hostPlayerId: string;
  isHost: boolean;
  onOpenProfile?: () => void;
  onRemovePlayer?: (playerId: string) => void | Promise<void>;
  layoutMode?: LayoutMode;
};

const floatTransition = (duration: number, delay: number) => ({
  duration,
  repeat: Infinity,
  ease: "easeInOut",
  delay,
});

export function LobbyPlayerOrbit({
  players,
  currentPlayerId,
  hostPlayerId,
  isHost,
  onOpenProfile,
  onRemovePlayer,
  layoutMode = "orbit",
}: LobbyPlayerOrbitProps) {
  const currentPlayer = players.find((player) => player.id === currentPlayerId);
  const orbitPlayers = useMemo(
    () => players.filter((player) => player.id !== currentPlayerId),
    [players, currentPlayerId],
  );
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setContainerSize({
          width: Math.max(width, 320),
          height: Math.max(height, 320),
        });
      });
    });

    observer.observe(element);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const layout = useMemo(
    () =>
      computeLobbyLayout(
        containerSize.width,
        containerSize.height,
        orbitPlayers,
        layoutMode,
      ),
    [containerSize, orbitPlayers, layoutMode],
  );

  return (
    <section className="relative flex w-full flex-1">
      <div
        ref={containerRef}
        className="relative mx-auto flex min-h-[320px] w-full flex-1 items-center justify-center overflow-hidden sm:min-h-[420px]"
      >
        <motion.div
          className="relative z-10 flex flex-col items-center justify-center gap-3"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative flex flex-col items-center justify-center gap-3">
            <motion.div
              role="button"
              tabIndex={0}
              onClick={onOpenProfile}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenProfile?.();
                }
              }}
              aria-label="Edit your profile"
              className={`relative flex items-center justify-center rounded-full text-4xl font-semibold text-white shadow-[0_25px_55px_rgba(255,107,153,0.3)] ring-6 ring-white/70 ${getAvatarClass(
                currentPlayer?.id ?? currentPlayer?.name ?? "you",
                currentPlayer?.color,
              )}`}
              style={{
                width: layout.coreSize,
                height: layout.coreSize,
              }}
            >
              <span className="pointer-events-none absolute left-[18%] top-[18%] h-[38%] w-[38%] rounded-full bg-white/20 blur-[1px]" />
              <span
                className={
                  currentPlayer?.avatar ? "text-7xl leading-none" : "text-5xl"
                }
              >
                {getAvatarLabel(currentPlayer?.name ?? "", currentPlayer?.avatar)}
              </span>
            </motion.div>
            <button
              type="button"
              onClick={onOpenProfile}
              className="absolute right-0 top-0 flex h-10 w-10 translate-x-1 translate-y-1 items-center justify-center rounded-full bg-white text-[#66a3ff] shadow-[0_10px_18px_rgba(102,163,255,0.2)] ring-4 ring-white/80 transition-transform hover:scale-105 active:scale-95"
              aria-label="Edit your profile"
            >
              <Pencil className="h-4 w-4 stroke-[3]" />
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenProfile}
            className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(0,0,0,0.08)] ring-2 ring-white/70"
            aria-label="Edit your profile"
          >
            {currentPlayer?.name ?? "Loading..."}
          </button>
          {currentPlayer?.id === hostPlayerId && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ff6b99] ring-2 ring-[#ff6b99]/20">
              Host
            </span>
          )}
        </motion.div>

        {orbitPlayers.length === 0 && (
          <p className="absolute top-full mt-6 text-sm text-slate-600">
            {isHost
              ? "Waiting for more players to join..."
              : "Waiting for the host to start the game..."}
          </p>
        )}

        {layout.bubbles.map((bubble) => {
          const player = orbitPlayers.find((item) => item.id === bubble.id);
          if (!player) return null;
          const isHostPlayer = player.id === hostPlayerId;
          const canRemove = isHost && player.id !== currentPlayerId;
          return (
            <motion.div
              key={bubble.id}
              className="absolute z-20 flex flex-col items-center"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                left: bubble.left,
                top: bubble.top,
              }}
              transition={{
                duration: 0.4,
                scale: { type: "spring", visualDuration: 0.4, bounce: 0.5 },
              }}
              style={{
                width: bubble.size,
              }}
            >
              <motion.div
                className="flex flex-col items-center"
                animate={{
                  x: [
                    -(bubble.floatX * 1.6),
                    bubble.floatX * 1.6,
                    -(bubble.floatX * 1.6),
                  ],
                  y: [0, bubble.floatY * 1.4, 0],
                  scale: [
                    1 - bubble.floatScale * 0.4,
                    1 + bubble.floatScale * 0.4,
                    1 - bubble.floatScale * 0.4,
                  ],
                }}
                transition={floatTransition(
                  Math.max(6, bubble.duration * 0.7),
                  Math.abs(bubble.delay),
                )}
              >
                <div
                  className={`relative flex items-center justify-center rounded-full text-lg font-semibold text-white shadow-[0_18px_40px_rgba(255,107,153,0.25)] ring-4 ring-white/70 ${getAvatarClass(
                    player.id ?? player.name,
                    player.color,
                  )}`}
                  style={{
                    width: bubble.size,
                    height: bubble.size,
                  }}
                >
                  <span className="pointer-events-none absolute left-[18%] top-[18%] h-[38%] w-[38%] rounded-full bg-white/20 blur-[1px]" />
                  <span className={player.avatar ? "text-5xl leading-none" : "text-2xl"}>
                    {getAvatarLabel(player.name, player.avatar)}
                  </span>
                </div>
                <div className="relative z-30 mt-2 rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-[0_6px_16px_rgba(0,0,0,0.08)] ring-2 ring-white/70">
                  {player.name}
                </div>
                {isHostPlayer && (
                  <span className="relative z-30 mt-1 rounded-full bg-white/80 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-[#ff6b99] ring-2 ring-[#ff6b99]/20">
                    Host
                  </span>
                )}
                {canRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="relative z-30 mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-white/90 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-rose-500 shadow-[0_6px_16px_rgba(0,0,0,0.08)] ring-2 ring-white/70 transition hover:scale-[1.02] active:scale-[0.98]"
                        aria-label={`Remove ${player.name}`}
                      >
                        <UserX className="h-3 w-3 stroke-[2.5]" />
                        Remove
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove player?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {player.name} will be removed from this lobby. They can
                          rejoin using the lobby code.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="gummyRed"
                          onClick={() => onRemovePlayer?.(player.id)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
