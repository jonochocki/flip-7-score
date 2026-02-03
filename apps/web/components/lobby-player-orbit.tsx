"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAvatarClass, getInitials } from "@/components/lobby-player-bubbles";

type Player = {
  id: string;
  name: string;
};

type LobbyPlayerOrbitProps = {
  players: Player[];
  currentPlayerId: string;
  hostPlayerId: string;
  isHost: boolean;
};

type OrbitBubble = {
  id: string;
  left: number;
  top: number;
  size: number;
  floatX: number;
  floatY: number;
  floatScale: number;
  duration: number;
  delay: number;
};

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 10000;
  }
  return hash;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type LayoutResult = {
  coreSize: number;
  bubbles: OrbitBubble[];
};

const computeLayout = (
  width: number,
  height: number,
  players: Player[],
): LayoutResult => {
  if (!width || !height || players.length === 0) {
    return { coreSize: 200, bubbles: [] };
  }

  const minDim = Math.min(width, height);
  const padding = Math.max(minDim * 0.06, 20);
  const labelSpace = 40;
  const coreSize = Math.min(220, minDim * 0.52);
  const maxOther = minDim * 0.22;
  const minOther = minDim * 0.14;
  const countAdjust = players.length * 6;
  const otherSize = clamp(maxOther - countAdjust, minOther, maxOther);
  const ringBase =
    coreSize / 2 + otherSize / 2 + Math.min(minDim * 0.08, 52);

  const centerX = width / 2;
  const centerY = height / 2;

  const placed: OrbitBubble[] = players.map((player, index) => {
    const seed = hashSeed(player.id ?? player.name);
    const angle =
      (index / Math.max(players.length, 1)) * Math.PI * 2 +
      (seed % 30) * 0.03;
    const radius = ringBase + (seed % 30);
    const left = centerX + Math.cos(angle) * radius - otherSize / 2;
    const top = centerY + Math.sin(angle) * radius - otherSize / 2;
    return {
      id: player.id,
      left,
      top,
      size: otherSize,
      floatX: ((seed % 16) - 8) * 0.7,
      floatY: ((seed % 18) - 9) * 0.7,
      floatScale: 0.08 + (seed % 5) * 0.02,
      duration: 10 + (seed % 8),
      delay: ((seed % 10) - 5) * 0.5,
    };
  });

  for (let iter = 0; iter < 28; iter += 1) {
    placed.forEach((bubble, i) => {
      let ax = 0;
      let ay = 0;
      const bx = bubble.left + bubble.size / 2;
      const by = bubble.top + bubble.size / 2;

      const coreDx = bx - centerX;
      const coreDy = by - centerY;
      const coreDistance = Math.hypot(coreDx, coreDy) || 1;
      const coreMin = coreSize / 2 + bubble.size / 2 + padding * 0.95;
      if (coreDistance < coreMin) {
        const push = (coreMin - coreDistance) / coreMin;
        ax += (coreDx / coreDistance) * push * 20;
        ay += (coreDy / coreDistance) * push * 20;
      }

      placed.forEach((other, j) => {
        if (i === j) return;
        const ox = other.left + other.size / 2;
        const oy = other.top + other.size / 2;
        const dx = bx - ox;
        const dy = by - oy;
        const distance = Math.hypot(dx, dy) || 1;
        const minDist = (bubble.size + other.size) * 0.58;
        if (distance < minDist) {
          const push = (minDist - distance) / minDist;
          ax += (dx / distance) * push * 16;
          ay += (dy / distance) * push * 16;
        }
      });

      const targetRadius = ringBase + (i % 3) * 10;
      const currentRadius = Math.hypot(bx - centerX, by - centerY) || 1;
      const radialDiff = currentRadius - targetRadius;
      ax += (-(coreDx / currentRadius) * radialDiff) * 0.08;
      ay += (-(coreDy / currentRadius) * radialDiff) * 0.08;

      const floatPad =
        Math.max(Math.abs(bubble.floatX), Math.abs(bubble.floatY)) +
        bubble.size * bubble.floatScale;

      bubble.left += ax;
      bubble.top += ay;

      bubble.left = clamp(
        bubble.left,
        padding + floatPad,
        width - bubble.size - padding - floatPad,
      );
      bubble.top = clamp(
        bubble.top,
        padding + floatPad,
        height - bubble.size - labelSpace - padding - floatPad,
      );
    });
  }

  return { coreSize, bubbles: placed };
};

export function LobbyPlayerOrbit({
  players,
  currentPlayerId,
  hostPlayerId,
  isHost,
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
    () => computeLayout(containerSize.width, containerSize.height, orbitPlayers),
    [containerSize, orbitPlayers],
  );

  return (
    <section className="relative w-full">
      <div
        ref={containerRef}
        className="relative mx-auto flex min-h-[380px] w-full items-center justify-center overflow-hidden sm:min-h-[460px]"
      >
        <div className="relative z-10 flex flex-col items-center justify-center gap-3">
          <div
            className={`flex items-center justify-center rounded-full text-3xl font-semibold text-white shadow-[0_25px_55px_rgba(31,43,122,0.35)] ${getAvatarClass(
              currentPlayer?.id ?? currentPlayer?.name ?? "you",
            )}`}
            style={{
              width: layout.coreSize,
              height: layout.coreSize,
              animation: "core-pulse 8s ease-in-out infinite",
            }}
          >
            {getInitials(currentPlayer?.name ?? "")}
          </div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {currentPlayer?.name ?? "Loading..."}
          </div>
          {currentPlayer?.id === hostPlayerId && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              Host
            </span>
          )}
        </div>

        {orbitPlayers.length === 0 && (
          <p className="absolute top-full mt-6 text-sm text-slate-600 dark:text-slate-200">
            {isHost
              ? "Waiting for more players to join..."
              : "Waiting for the host to start the game..."}
          </p>
        )}

        {layout.bubbles.map((bubble) => {
          const player = orbitPlayers.find((item) => item.id === bubble.id);
          if (!player) return null;
          const isHostPlayer = player.id === hostPlayerId;
          return (
            <div
              key={bubble.id}
              className="player-bubble absolute flex flex-col items-center"
              style={{
                left: bubble.left,
                top: bubble.top,
                width: bubble.size,
                animation: `floaty ${bubble.duration}s ease-in-out ${bubble.delay}s infinite`,
                ["--float-x" as string]: `${bubble.floatX}px`,
                ["--float-y" as string]: `${bubble.floatY}px`,
                ["--float-scale" as string]: `${bubble.floatScale}`,
              }}
            >
              <div
                className={`player-bubble__avatar flex items-center justify-center rounded-full text-xs font-semibold text-white shadow-[0_18px_40px_rgba(31,43,122,0.28)] ${getAvatarClass(
                  player.id ?? player.name,
                )}`}
                style={{
                  width: bubble.size,
                  height: bubble.size,
                }}
              >
                {getInitials(player.name)}
              </div>
              <div className="mt-2 text-[11px] font-medium text-slate-600 dark:text-slate-200">
                {player.name}
              </div>
              {isHostPlayer && (
                <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                  Host
                </span>
              )}
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .player-bubble {
          transition: left 0.6s ease, top 0.6s ease, width 0.6s ease;
        }

        .player-bubble__avatar {
          transition: width 0.6s ease, height 0.6s ease;
        }

        @keyframes floaty {
          0%,
          100% {
            transform: translate3d(calc(var(--float-x) * -1), 0, 0)
              scale(calc(1 - var(--float-scale)));
          }
          50% {
            transform: translate3d(var(--float-x), var(--float-y), 0)
              scale(calc(1 + var(--float-scale)));
          }
        }

        @keyframes core-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }
      `}</style>
    </section>
  );
}
