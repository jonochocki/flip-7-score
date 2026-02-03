"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Player = {
  id: string;
  name: string;
};

type Bubble = {
  id: string;
  left: number;
  top: number;
  size: number;
  drift: number;
};

type LobbyPlayerBubblesProps = {
  players: Player[];
  currentPlayerId: string;
  hostPlayerId: string;
  isHost: boolean;
};

const AVATAR_COLORS = [
  "bg-amber-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-lime-500",
  "bg-sky-500",
  "bg-orange-500",
] as const;

export const AVATAR_SIZE = 64;

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 10000;
  }
  return hash;
};

const seededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

export const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase() || "--";
};

export const getAvatarClass = (seed: string) => {
  const hash = hashSeed(seed);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export function LobbyPlayerBubbles({
  players,
  currentPlayerId,
  hostPlayerId,
  isHost,
}: LobbyPlayerBubblesProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [floatContainer, setFloatContainer] = useState<HTMLDivElement | null>(
    null,
  );

  const floatPlayers = useMemo(
    () => players.filter((player) => player.id !== currentPlayerId),
    [players, currentPlayerId],
  );

  const floatPlayerIds = useMemo(
    () => floatPlayers.map((player) => player.id).join("|"),
    [floatPlayers],
  );

  const setFloatRef = useCallback((node: HTMLDivElement | null) => {
    setFloatContainer(node);
  }, []);

  useEffect(() => {
    const container = floatContainer;
    if (!container || floatPlayers.length === 0) {
      setBubbles([]);
      return;
    }

    const layout = () => {
      const bounds = container.getBoundingClientRect();
      const width = Math.max(bounds.width, 320);
      const height = Math.max(bounds.height, 260);
      const centerX = width / 2;
      const centerY = height / 2;
      const placed: Bubble[] = [];
      const padding = 12;

      floatPlayers.forEach((player, index) => {
        const seed = hashSeed(player.id ?? player.name) + index * 13;
        const rand = seededRandom(seed);
        const size = AVATAR_SIZE + 28;
        const angle = (index / Math.max(floatPlayers.length, 1)) * Math.PI * 2;
        const ring = Math.min(width, height) * 0.18 + (index % 3) * 14;
        const left = centerX + Math.cos(angle) * ring - size / 2;
        const top = centerY + Math.sin(angle) * ring - size / 2;
        placed.push({
          id: player.id,
          left,
          top,
          size,
          drift: 6 + Math.floor(rand() * 6),
        });
      });

      const relax = (iterations: number) => {
        for (let iter = 0; iter < iterations; iter += 1) {
          placed.forEach((bubble, i) => {
            let ax = 0;
            let ay = 0;
            const bx = bubble.left + bubble.size / 2;
            const by = bubble.top + bubble.size / 2;

            placed.forEach((other, j) => {
              if (i === j) return;
              const ox = other.left + other.size / 2;
              const oy = other.top + other.size / 2;
              const dx = bx - ox;
              const dy = by - oy;
              const distance = Math.hypot(dx, dy) || 1;
              const minDist = (bubble.size + other.size) * 0.48;
              if (distance < minDist) {
                const push = (minDist - distance) / minDist;
                ax += (dx / distance) * push * 18;
                ay += (dy / distance) * push * 18;
              }
            });

            const toCenterX = centerX - bx;
            const toCenterY = centerY - by;
            ax += toCenterX * 0.02;
            ay += toCenterY * 0.02;

            bubble.left += ax;
            bubble.top += ay;

            bubble.left = Math.min(
              Math.max(bubble.left, padding),
              width - bubble.size - padding,
            );
            bubble.top = Math.min(
              Math.max(bubble.top, padding),
              height - bubble.size - padding,
            );
          });
        }
      };

      relax(30);
      setBubbles(placed);
    };

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(container);

    return () => observer.disconnect();
  }, [floatContainer, floatPlayerIds, floatPlayers.length]);

  return (
    <div className="relative min-h-[360px] overflow-hidden">
      <div ref={setFloatRef} className="relative h-[320px] sm:h-[420px]">
        {floatPlayers.length === 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-200">
            {isHost
              ? "Waiting for more players to join..."
              : "Waiting for the host to start the game..."}
          </p>
        )}
        {bubbles.map((bubble) => {
          const player = floatPlayers.find((item) => item.id === bubble.id);
          if (!player) return null;
          const seed = player.id ?? player.name;
          const duration = 16 + bubble.drift;
          const delay = (hashSeed(seed) % 10) * -0.4;
          const isHostPlayer = player.id === hostPlayerId;
          return (
            <div
              key={player.id}
              className="absolute flex flex-col items-center gap-2"
              style={{
                left: bubble.left,
                top: bubble.top,
                width: bubble.size,
                animation: `floaty ${duration}s ease-in-out ${delay}s infinite, drift ${
                  duration * 1.6
                }s ease-in-out ${delay * 0.6}s infinite`,
                ["--float-x" as string]: `${(hashSeed(seed) % 16) - 8}px`,
                ["--float-y" as string]: `${(hashSeed(seed) % 20) - 10}px`,
              }}
            >
              <div
                className={`flex items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg ${getAvatarClass(
                  seed,
                )}`}
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                }}
              >
                {getInitials(player.name)}
              </div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-200">
                {player.name}
              </div>
              {isHostPlayer && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                  Host
                </span>
              )}
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes floaty {
          0%,
          100% {
            transform: translate3d(-6px, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(6px, -18px, 0) scale(1.03);
          }
        }

        @keyframes drift {
          0%,
          100% {
            transform: translate3d(calc(var(--float-x) * -1), 0, 0);
          }
          50% {
            transform: translate3d(var(--float-x), var(--float-y), 0);
          }
        }
      `}</style>
    </div>
  );
}
