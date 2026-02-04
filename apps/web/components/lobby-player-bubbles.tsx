"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Player = {
  id: string;
  name: string;
  avatar?: string | null;
  color?: string | null;
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
  { key: "pink", className: "bg-gradient-to-br from-rose-400 to-pink-500" },
  { key: "orange", className: "bg-gradient-to-br from-amber-300 to-orange-400" },
  { key: "blue", className: "bg-gradient-to-br from-sky-300 to-blue-500" },
  { key: "teal", className: "bg-gradient-to-br from-emerald-300 to-teal-500" },
  { key: "purple", className: "bg-gradient-to-br from-purple-400 to-indigo-500" },
  { key: "magenta", className: "bg-gradient-to-br from-fuchsia-400 to-pink-500" },
  { key: "yellow", className: "bg-gradient-to-br from-yellow-300 to-amber-400" },
  { key: "cyan", className: "bg-gradient-to-br from-cyan-300 to-sky-500" },
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

export const getAvatarClass = (seed: string, color?: string | null) => {
  if (color) {
    const matched = AVATAR_COLORS.find((item) => item.key === color);
    if (matched) return matched.className;
  }
  const hash = hashSeed(seed);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length].className;
};

export const getAvatarLabel = (name: string, avatar?: string | null) => {
  if (avatar) return avatar;
  return getInitials(name);
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
                className={`relative flex items-center justify-center rounded-full text-xl font-semibold text-white shadow-[0_14px_30px_rgba(255,107,153,0.25)] ring-4 ring-white/70 ${getAvatarClass(
                  seed,
                  player.color,
                )}`}
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                }}
              >
                <span className="pointer-events-none absolute left-[18%] top-[18%] h-[38%] w-[38%] rounded-full bg-white/20 blur-[1px]" />
                <span
                  className={
                    player.avatar ? "text-3xl leading-none" : "text-sm"
                  }
                >
                  {getAvatarLabel(player.name, player.avatar)}
                </span>
              </div>
              <div className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-[0_6px_16px_rgba(0,0,0,0.08)] ring-2 ring-white/70">
                {player.name}
              </div>
              {isHostPlayer && (
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ff6b99] ring-2 ring-[#ff6b99]/20">
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
