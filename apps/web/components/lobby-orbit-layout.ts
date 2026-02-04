"use client";

type Player = {
  id: string;
  name: string;
};

export type OrbitBubble = {
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

export type LayoutMode = "orbit" | "cluster";

type LayoutResult = {
  coreSize: number;
  bubbles: OrbitBubble[];
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

export const computeLobbyLayout = (
  width: number,
  height: number,
  players: Player[],
  mode: LayoutMode,
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
    coreSize / 2 +
    otherSize / 2 +
    Math.min(minDim * (mode === "orbit" ? 0.08 : 0.04), mode === "orbit" ? 52 : 32);

  const centerX = width / 2;
  const centerY = height / 2;

  const placed: OrbitBubble[] = players.map((player, index) => {
    const seed = hashSeed(player.id ?? player.name);
    const angle =
      (index / Math.max(players.length, 1)) * Math.PI * 2 +
      (seed % 30) * 0.03;
    const baseRadius = ringBase + (seed % 30);
    const radius = mode === "orbit" ? baseRadius : baseRadius * 0.7;
    const left = centerX + Math.cos(angle) * radius - otherSize / 2;
    const top = centerY + Math.sin(angle) * radius - otherSize / 2;
    return {
      id: player.id,
      left,
      top,
      size: otherSize,
      floatX: ((seed % 16) - 8) * (mode === "orbit" ? 0.7 : 0.5),
      floatY: ((seed % 18) - 9) * (mode === "orbit" ? 0.7 : 0.5),
      floatScale: 0.08 + (seed % 5) * 0.02,
      duration: 10 + (seed % 8),
      delay: ((seed % 10) - 5) * 0.5,
    };
  });

  for (let iter = 0; iter < 40; iter += 1) {
    placed.forEach((bubble, i) => {
      let ax = 0;
      let ay = 0;
      const bx = bubble.left + bubble.size / 2;
      const by = bubble.top + bubble.size / 2;

      const coreDx = bx - centerX;
      const coreDy = by - centerY;
      const coreDistance = Math.hypot(coreDx, coreDy) || 1;
      const coreMin =
        coreSize / 2 +
        bubble.size / 2 +
        padding * (mode === "orbit" ? 1.15 : 0.9);
      if (coreDistance < coreMin) {
        const push = (coreMin - coreDistance) / coreMin;
        ax += (coreDx / coreDistance) * push * 26;
        ay += (coreDy / coreDistance) * push * 26;
      }

      placed.forEach((other, j) => {
        if (i === j) return;
        const ox = other.left + other.size / 2;
        const oy = other.top + other.size / 2;
        const dx = bx - ox;
        const dy = by - oy;
        const distance = Math.hypot(dx, dy) || 1;
        const minDist =
          (bubble.size + other.size) * (mode === "orbit" ? 0.7 : 0.85);
        if (distance < minDist) {
          const push = (minDist - distance) / minDist;
          ax += (dx / distance) * push * 22;
          ay += (dy / distance) * push * 22;
        }
      });

      if (mode === "orbit") {
        const targetRadius = ringBase + (i % 3) * 10;
        const currentRadius = Math.hypot(bx - centerX, by - centerY) || 1;
        const radialDiff = currentRadius - targetRadius;
        ax += (-(coreDx / currentRadius) * radialDiff) * 0.08;
        ay += (-(coreDy / currentRadius) * radialDiff) * 0.08;
      } else {
        ax += (centerX - bx) * 0.01;
        ay += (centerY - by) * 0.01;
      }

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
