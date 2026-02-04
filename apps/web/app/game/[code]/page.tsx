"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Image from "next/image";
import { Button } from "@workspace/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { Users } from "lucide-react";
import confetti from "canvas-confetti";
import { AppHeader } from "@/components/app-header";
import { GameCardGrid } from "@/components/game-card-grid";
import { GameScoreDisplay } from "@/components/game-score-display";
import { SessionGate } from "@/components/session-gate";
import {
  AVATAR_SIZE,
  getAvatarClass,
  getAvatarLabel,
} from "@/components/lobby-player-bubbles";
import { useAnonSession } from "@/hooks/use-anon-session";

type GameState = "loading" | "ready" | "error";

type Player = {
  id: string;
  name: string;
  status?: "active" | "busted" | "frozen" | "stayed" | "left";
  avatar?: string | null;
  color?: string | null;
};

type TotalScore = {
  player_id: string;
  name: string;
  total_score: number;
};

type CardSpec = {
  label: string;
  color: string;
};

const NUMBER_CARDS: CardSpec[] = [
  { label: "0", color: "text-neutral-900" },
  { label: "1", color: "text-stone-600" },
  { label: "2", color: "text-lime-500" },
  { label: "3", color: "text-rose-500" },
  { label: "4", color: "text-teal-400" },
  { label: "5", color: "text-emerald-500" },
  { label: "6", color: "text-purple-500" },
  { label: "7", color: "text-rose-400" },
  { label: "8", color: "text-lime-600" },
  { label: "9", color: "text-orange-400" },
  { label: "10", color: "text-red-500" },
  { label: "11", color: "text-sky-400" },
  { label: "12", color: "text-stone-500" },
];

const MODIFIER_CARDS: CardSpec[] = [
  { label: "+2", color: "text-orange-500" },
  { label: "+4", color: "text-orange-500" },
  { label: "+6", color: "text-orange-500" },
  { label: "+8", color: "text-orange-500" },
  { label: "+10", color: "text-orange-500" },
  { label: "x2", color: "text-orange-500" },
];

const AvatarBubble = ({
  seed,
  name,
  size,
  avatar,
  color,
}: {
  seed: string;
  name: string;
  size: number;
  avatar?: string | null;
  color?: string | null;
}) => (
  <div
    className={`flex items-center justify-center rounded-full font-semibold text-white shadow-lg ${getAvatarClass(
      seed,
      color,
    )}`}
    style={{ width: size, height: size }}
  >
    <span
      className="leading-none"
      style={{ fontSize: Math.max(12, Math.floor(size / 2.4)) }}
    >
      {getAvatarLabel(name, avatar)}
    </span>
  </div>
);

const GameSessionLoading = () => (
  <main className="relative min-h-svh overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-6 py-10 text-sm text-slate-600 dark:from-[#0b1020] dark:via-[#151a2e] dark:to-[#0b1020] dark:text-slate-300">
    <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_2px_2px,rgba(79,70,229,0.18)_2px,transparent_0)] [background-size:24px_24px] dark:opacity-55 dark:[background-image:radial-gradient(circle_at_2px_2px,rgba(148,163,184,0.35)_2px,transparent_0)]" />
    <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#ff99b8]/40 to-[#ffd966]/40 blur-3xl dark:from-[#6a2b7a]/70 dark:to-[#6a4a1d]/55" />
    <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-gradient-to-bl from-[#66e0ff]/40 to-[#ff99b8]/40 blur-3xl dark:from-[#0b4a66]/65 dark:to-[#6a2b7a]/55" />
    <div className="relative mx-auto flex min-h-[70svh] items-center justify-center">
      <div className="rounded-full bg-gradient-to-r from-[#ff8cc3] via-[#ffd966] to-[#66e0ff] p-[3px] shadow-[0_18px_40px_-18px_rgba(255,107,153,0.5)] dark:shadow-[0_18px_40px_-18px_rgba(236,72,153,0.45)]">
        <div className="rounded-full bg-white/95 px-6 py-3 text-sm font-black uppercase tracking-[0.25em] text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.95)] dark:bg-slate-950/95 dark:text-slate-100">
          Setting up game...
        </div>
      </div>
    </div>
  </main>
);

export default function GamePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [state, setState] = useState<GameState>("loading");
  const [error, setError] = useState("");
  const [gameStatus, setGameStatus] = useState<string>("");
  const [gameId, setGameId] = useState("");
  const [currentPlayerId, setCurrentPlayerId] = useState("");
  const [hostPlayerId, setHostPlayerId] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentRoundId, setCurrentRoundId] = useState("");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [submittedFlip7Bonus, setSubmittedFlip7Bonus] = useState(false);
  const [roundIndex, setRoundIndex] = useState(1);
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [allSubmittedRoundId, setAllSubmittedRoundId] = useState("");
  const [roundScores, setRoundScores] = useState<
    { player_id: string; score: number; flip7_bonus: boolean }[]
  >([]);
  const [roundStateReady, setRoundStateReady] = useState(false);
  const [totals, setTotals] = useState<TotalScore[]>([]);
  const [isRematchStarting, setIsRematchStarting] = useState(false);
  const {
    session,
    error: sessionError,
    loading: sessionLoading,
    supabase: supabaseClient,
  } = useAnonSession();
  const playersCountRef = useRef(0);
  const currentPlayerIdRef = useRef("");
  const currentRoundIdRef = useRef("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasFiredConfettiRef = useRef(false);
  const winnerConfettiIntervalRef = useRef<number | null>(null);
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";

  useEffect(() => {
    playersCountRef.current = players.length;
  }, [players.length]);

  useEffect(() => {
    currentPlayerIdRef.current = currentPlayerId;
  }, [currentPlayerId]);

  useEffect(() => {
    currentRoundIdRef.current = currentRoundId;
  }, [currentRoundId]);

  useEffect(() => {
    if (!code || sessionLoading) return;
    const supabase = supabaseClient;

    const init = async () => {
      const { data: gameData } = await supabase.rpc("get_game_by_code", {
        p_code: code,
      });
      if (!gameData?.length) {
        setState("error");
        setError("Game not found.");
        return;
      }

      const game = gameData[0];
      setGameId(game.id);

      const readStoredPlayer = () => {
        if (typeof window === "undefined") return null;
        try {
          const key = `flip7_player_${code}`;
          const raw =
            sessionStorage.getItem(key) ?? localStorage.getItem(key);
          if (!raw) return null;
          const parsed = JSON.parse(raw) as {
            playerId?: string;
            gameId?: string;
          };
          if (!parsed?.playerId || !parsed?.gameId) return null;
          if (parsed.gameId !== game.id) return null;
          return parsed;
        } catch {
          return null;
        }
      };

      let resolvedPlayerId = "";
      const storedPlayer = readStoredPlayer();
      if (storedPlayer?.playerId) {
        resolvedPlayerId = storedPlayer.playerId;
      } else {
        const userId = session?.user.id;
        if (userId) {
          const { data: existingPlayer } = await supabase
            .from("players")
            .select("id")
            .eq("game_id", game.id)
            .eq("user_id", userId)
            .maybeSingle();
          if (existingPlayer?.id) {
            resolvedPlayerId = existingPlayer.id;
            try {
              const key = `flip7_player_${code}`;
              const value = JSON.stringify({
                gameId: game.id,
                playerId: existingPlayer.id,
              });
              sessionStorage.setItem(key, value);
              localStorage.setItem(key, value);
            } catch {
              // Ignore storage failures (common on some Android setups).
            }
          }
        }
      }

      if (!resolvedPlayerId) {
        router.replace(`/lobby/${code}`);
        return;
      }
      setCurrentPlayerId(resolvedPlayerId);

      if (game.status !== "active") {
        router.replace(`/lobby/${code}`);
        return;
      }

      setGameStatus(game.status);
      const { data: hostData } = await supabase
        .from("games")
        .select("host_player_id")
        .eq("id", game.id)
        .maybeSingle();
      if (hostData?.host_player_id) {
        setHostPlayerId(hostData.host_player_id);
      }
      await loadPlayers(game.id, resolvedPlayerId, supabase);
      await loadCurrentRound(game.id, supabase);
      setState("ready");
    };

    init();
  }, [code, router, sessionLoading, supabaseClient]);

  useEffect(() => {
    if (!gameId || !currentPlayerId) return;
    const supabase = supabaseClient;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = () => {
      channel = supabase
        .channel(`game:${gameId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "games",
            filter: `id=eq.${gameId}`,
          },
          async () => {
            const { data: game } = await supabase
              .from("games")
              .select("status, host_player_id")
              .eq("id", gameId)
              .maybeSingle();
            if (game?.status) {
              setGameStatus(game.status);
            }
            if (game?.host_player_id) {
              setHostPlayerId(game.host_player_id);
            }
          },
        );

      if (currentRoundId) {
        channel = channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "round_scores",
            filter: `round_id=eq.${currentRoundId}`,
          },
          async () => {
            await refreshRoundState(supabase);
          },
        );
      }

      channel = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
            filter: `game_id=eq.${gameId}`,
          },
          async () => {
            await loadPlayers(gameId, supabase);
          },
        )
        .on(
          "broadcast",
          { event: "rematch" },
          ({ payload }: { payload?: { code?: string } }) => {
            const nextCode = payload?.code;
            if (!nextCode) return;
            router.replace(`/lobby/${nextCode}`);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "rounds",
            filter: `game_id=eq.${gameId}`,
          },
          async () => {
            await loadCurrentRound(gameId, supabase);
          },
        )
        .subscribe((status) => {
          console.info("[game] channel status:", status);
          if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
            console.warn("[game] realtime issue, resubscribing");
            if (channel) {
              supabase.removeChannel(channel);
            }
            subscribe();
          }
        });
      channelRef.current = channel;
    };

    subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      channelRef.current = null;
    };
  }, [gameId, currentPlayerId, currentRoundId, router, supabaseClient]);

  useEffect(() => {
    if (!gameId || !currentRoundId || allSubmitted) return;
    const supabase = supabaseClient;
    const interval = setInterval(() => {
      refreshRoundState(supabase);
    }, 3000);
    return () => clearInterval(interval);
  }, [allSubmitted, currentRoundId, gameId, supabaseClient]);

  useEffect(() => {
    if (!gameId || !allSubmitted) return;
    const supabase = supabaseClient;
    const interval = setInterval(() => {
      loadCurrentRound(gameId, supabase);
    }, 4000);
    return () => clearInterval(interval);
  }, [allSubmitted, gameId, supabaseClient]);

  useEffect(() => {
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const loadPlayers = async (
    id: string,
    playerId: string,
    supabase = supabaseClient,
  ) => {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, name, status, avatar, color")
      .eq("game_id", id)
      .order("seat_order", { ascending: true });
    setPlayers(playersData ?? []);
    playersCountRef.current = playersData?.length ?? 0;
    const current = playersData?.find((player) => player.id === playerId);
    if (current) {
      setCurrentPlayer(current);
    }
  };

  const loadCurrentRound = async (id: string, supabase = supabaseClient) => {
    const { data: roundData } = await supabase.rpc("get_current_round", {
      p_game_id: id,
    });
    if (roundData?.length) {
      const nextRoundId = roundData[0].round_id;
      const nextRoundIndex = roundData[0].round_index;
      if (nextRoundId === currentRoundIdRef.current) {
        return;
      }
      setRoundStateReady(false);
      setCurrentRoundId(nextRoundId);
      setRoundIndex(nextRoundIndex);
      setSelectedCards([]);
      setHasSubmitted(false);
      setSubmittedScore(null);
      setSubmittedFlip7Bonus(false);
      setAllSubmitted(false);
      setAllSubmittedRoundId("");
      setRoundScores([]);
      await refreshRoundState(supabase, nextRoundId);
    }
  };

  const refreshRoundState = async (
    supabase = supabaseClient,
    roundId = currentRoundId,
  ) => {
    if (!gameId || !roundId) return;
    const { data: canAdvance } = await supabase.rpc("can_advance_round", {
      p_game_id: gameId,
    });
    const { data: scoresData, error: scoresError } = await supabase
      .from("round_scores")
      .select("player_id, score, flip7_bonus")
      .eq("round_id", roundId);
    if (scoresError) {
      console.error("[game] round_scores error", scoresError);
    }
    setRoundScores(scoresData ?? []);
    const currentPlayerScore = scoresData?.find(
      (score) => score.player_id === currentPlayerIdRef.current,
    );
    if (currentPlayerScore) {
      setHasSubmitted(true);
      setSelectedCards([]);
      setSubmittedScore(currentPlayerScore.score);
      setSubmittedFlip7Bonus(!!currentPlayerScore.flip7_bonus);
    }
    const scoresCount = scoresData?.length ?? 0;
    const everyoneSubmitted =
      scoresCount > 0 &&
      playersCountRef.current > 0 &&
      scoresCount >= playersCountRef.current;
    if (scoresCount === 0) {
      setAllSubmitted(false);
      setAllSubmittedRoundId("");
    } else if (allSubmittedRoundId === roundId) {
      setAllSubmitted(true);
    } else {
      const nextAllSubmitted = !!canAdvance || everyoneSubmitted;
      setAllSubmitted(nextAllSubmitted);
      if (nextAllSubmitted) {
        setAllSubmittedRoundId(roundId);
      }
    }
    const { data: totalsData, error: totalsError } = await supabase.rpc(
      "get_game_totals",
      {
        p_game_id: gameId,
      },
    );
    if (totalsError) {
      console.error("[game] get_game_totals error", totalsError);
    }
    setTotals(totalsData ?? []);
    setRoundStateReady(true);
  };

  const toggleCard = (label: string) => {
    const isNumberCard = /^\d+$/.test(label);
    setSelectedCards((prev) => {
      if (prev.includes(label)) {
        return prev.filter((card) => card !== label);
      }
      if (isNumberCard) {
        const numberCount = prev.filter((card) => /^\d+$/.test(card)).length;
        if (numberCount >= 7) return prev;
      }
      return [...prev, label];
    });
  };

  const getScoreTotal = (selected: string[]) => {
    let total = 0;
    let hasX2 = false;
    let numberCount = 0;

    selected.forEach((label) => {
      if (label === "x2") {
        hasX2 = true;
        return;
      }
      if (label.startsWith("+")) {
        const value = Number(label.slice(1));
        if (!Number.isNaN(value)) total += value;
        return;
      }
      const value = Number(label);
      if (!Number.isNaN(value)) {
        total += value;
        numberCount += 1;
      }
    });

    const baseTotal = hasX2 ? total * 2 : total;
    const isFlip7Bonus = numberCount === 7;
    return {
      total: baseTotal + (isFlip7Bonus ? 15 : 0),
      isFlip7Bonus,
    };
  };

  const handleSubmitScore = async () => {
    if (hasSubmitted || !currentRoundId) {
      console.warn("[game] submit blocked", {
        hasSubmitted,
        currentRoundId,
      });
      return;
    }
    const supabase = supabaseClient;
    const { total, isFlip7Bonus } = getScoreTotal(selectedCards);
    const { error: submitError } = await supabase.rpc("submit_score", {
      p_round_id: currentRoundId,
      p_score: total,
      p_flip7_bonus: isFlip7Bonus,
    });
    if (submitError) {
      console.error("[game] submit_score failed", submitError);
      setError(submitError.message);
      setState("error");
      return;
    }
    setHasSubmitted(true);
    setSubmittedScore(total);
    setSubmittedFlip7Bonus(isFlip7Bonus);
  };

  const handleNextRound = async () => {
    if (!gameId) return;
    const supabase = supabaseClient;
    const { error: roundError } = await supabase.rpc("create_round", {
      p_game_id: gameId,
    });
    if (roundError) {
      setError(roundError.message);
      setState("error");
      return;
    }
    const { error: resetError } = await supabase
      .from("players")
      .update({ status: "active" })
      .eq("game_id", gameId)
      .neq("status", "left");
    if (resetError) {
      setError(resetError.message);
      setState("error");
      return;
    }
    await loadCurrentRound(gameId, supabase);
  };

  const handleBustPlayer = async (playerId: string) => {
    if (!currentPlayerId || currentPlayerId !== hostPlayerId) return;
    const supabase = supabaseClient;
    const { error: updateError } = await supabase
      .from("players")
      .update({ status: "busted" })
      .eq("id", playerId);
    if (updateError) {
      setError(updateError.message);
      setState("error");
    }
  };

  const handleFreezePlayer = async (playerId: string) => {
    if (!currentPlayerId || currentPlayerId !== hostPlayerId) return;
    const supabase = supabaseClient;
    const { error: updateError } = await supabase
      .from("players")
      .update({ status: "frozen" })
      .eq("id", playerId);
    if (updateError) {
      setError(updateError.message);
      setState("error");
    }
  };

  const handlePlayAgain = async () => {
    if (!gameId || !isHost || isRematchStarting) return;
    setIsRematchStarting(true);
    const supabase = supabaseClient;
    const { data, error: rematchError } = await supabase.rpc(
      "create_rematch_game",
      {
        p_game_id: gameId,
      },
    );

    if (rematchError || !data?.length) {
      setError(rematchError?.message ?? "Failed to create rematch.");
      setState("error");
      setIsRematchStarting(false);
      return;
    }

    const rematch = data[0];
    const userId = session?.user.id;

    if (userId) {
      const { data: rematchPlayer } = await supabase
        .from("players")
        .select("id")
        .eq("game_id", rematch.game_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (rematchPlayer?.id) {
        localStorage.setItem(
          "flip7_host_lobby",
          JSON.stringify({
            gameId: rematch.game_id,
            code: rematch.code,
            playerId: rematchPlayer.id,
          }),
        );
        localStorage.setItem(
          `flip7_player_${rematch.code}`,
          JSON.stringify({
            gameId: rematch.game_id,
            playerId: rematchPlayer.id,
          }),
        );
      }
    }

    await channelRef.current?.send({
      type: "broadcast",
      event: "rematch",
      payload: { code: rematch.code },
    });

    router.replace(`/lobby/${rematch.code}`);
  };

  const isHost = !!currentPlayerId && currentPlayerId === hostPlayerId;
  const scoreSummary = getScoreTotal(selectedCards);
  const displayScore = hasSubmitted
    ? submittedScore ?? scoreSummary.total
    : scoreSummary.total;
  const displayFlip7 = hasSubmitted
    ? submittedFlip7Bonus
    : scoreSummary.isFlip7Bonus;
  const scoreSize = hasSubmitted ? "large" : "default";
  const sortedTotals = [...totals].sort(
    (a, b) => b.total_score - a.total_score,
  );
  const winner = sortedTotals[0];
  const isGameOver = !!winner && winner.total_score >= 200 && allSubmitted;
  const currentStatus = players.find(
    (player) => player.id === currentPlayerId,
  )?.status;

  useEffect(() => {
    if (!isGameOver || !winner) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fireBurst = () => {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.5 },
      });
      confetti({
        particleCount: 45,
        spread: 55,
        angle: 60,
        origin: { x: 0, y: 0.5 },
      });
      confetti({
        particleCount: 45,
        spread: 55,
        angle: 120,
        origin: { x: 1, y: 0.5 },
      });
    };

    if (!hasFiredConfettiRef.current) {
      fireBurst();
      hasFiredConfettiRef.current = true;
    }

    const isWinner = currentPlayerId === winner.player_id;
    if (isWinner && !winnerConfettiIntervalRef.current) {
      winnerConfettiIntervalRef.current = window.setInterval(() => {
        fireBurst();
      }, 2200);
    }

    if (!isWinner && winnerConfettiIntervalRef.current) {
      window.clearInterval(winnerConfettiIntervalRef.current);
      winnerConfettiIntervalRef.current = null;
    }

    return () => {
      if (winnerConfettiIntervalRef.current) {
        window.clearInterval(winnerConfettiIntervalRef.current);
        winnerConfettiIntervalRef.current = null;
      }
    };
  }, [currentPlayerId, isGameOver, winner]);

  if (state === "loading") {
    return (
      <main className="relative min-h-svh overflow-hidden px-6 py-10 text-sm text-slate-600 dark:text-slate-300">
        <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10 md:gap-4 md:py-6">
          <header className="relative flex items-center justify-between gap-4">
            <div className="h-10 w-10" />
            <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 justify-center">
              <Image
                src="/assets/img/7-score-logo.png"
                alt="7 Score"
                width={160}
                height={48}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>
            <div className="h-10 w-10" />
          </header>
        </div>
        <div className="relative mx-auto flex min-h-[70svh] items-center justify-center">
          <div className="loading-pill-border relative rounded-full p-[3px] shadow-[0_18px_40px_-18px_rgba(255,107,153,0.5)] dark:shadow-[0_18px_40px_-18px_rgba(236,72,153,0.45)]">
            <div className="relative z-10 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.25em] text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.95)] dark:bg-slate-950/95 dark:text-slate-100">
              Loading game...
            </div>
          </div>
        </div>
        <style jsx>{`
          .loading-pill-border {
            position: relative;
            overflow: hidden;
          }
          .loading-pill-border::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            --spin-angle: 0deg;
            background: conic-gradient(
              from var(--spin-angle),
              #ff8cc3,
              #ffb3c7,
              #ffd966,
              #fff1a6,
              #66e0ff,
              #7dd3fc,
              #22d3ee,
              #a855f7,
              #f472b6,
              #ff8cc3
            );
            animation: spin-angle 8s linear infinite;
            will-change: background;
          }
          :global(.dark) .loading-pill-border::before {
            background: conic-gradient(
              from var(--spin-angle),
              #6a2b7a,
              #8b5cf6,
              #7c3aed,
              #f59e0b,
              #fbbf24,
              #0b4a66,
              #22d3ee,
              #38bdf8,
              #a855f7,
              #ec4899,
              #6a2b7a
            );
          }
          @property --spin-angle {
            syntax: "<angle>";
            inherits: false;
            initial-value: 0deg;
          }
          @keyframes spin-angle {
            to {
              --spin-angle: 1turn;
            }
          }
        `}</style>
      </main>
    );
  }

  if (state === "ready" && !roundStateReady) {
    return (
      <main className="relative min-h-svh overflow-hidden px-6 py-10 text-sm text-slate-600 dark:text-slate-300">
        <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10 md:gap-4 md:py-6">
          <header className="relative flex items-center justify-between gap-4">
            <div className="h-10 w-10" />
            <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 justify-center">
              <Image
                src="/assets/img/7-score-logo.png"
                alt="7 Score"
                width={160}
                height={48}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>
            <div className="h-10 w-10" />
          </header>
        </div>
        <div className="relative mx-auto flex min-h-[70svh] items-center justify-center">
          <div className="loading-pill-border relative rounded-full p-[3px] shadow-[0_18px_40px_-18px_rgba(255,107,153,0.5)] dark:shadow-[0_18px_40px_-18px_rgba(236,72,153,0.45)]">
            <div className="relative z-10 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.25em] text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.95)] dark:bg-slate-950/95 dark:text-slate-100">
              Loading Lobby...
            </div>
          </div>
        </div>
        <style jsx>{`
          .loading-pill-border {
            position: relative;
            overflow: hidden;
          }
          .loading-pill-border::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            --spin-angle: 0deg;
            background: conic-gradient(
              from var(--spin-angle),
              #ff8cc3,
              #ffb3c7,
              #ffd966,
              #fff1a6,
              #66e0ff,
              #7dd3fc,
              #22d3ee,
              #a855f7,
              #f472b6,
              #ff8cc3
            );
            animation: spin-angle 8s linear infinite;
            will-change: background;
          }
          :global(.dark) .loading-pill-border::before {
            background: conic-gradient(
              from var(--spin-angle),
              #6a2b7a,
              #8b5cf6,
              #7c3aed,
              #f59e0b,
              #fbbf24,
              #0b4a66,
              #22d3ee,
              #38bdf8,
              #a855f7,
              #ec4899,
              #6a2b7a
            );
          }
          @property --spin-angle {
            syntax: "<angle>";
            inherits: false;
            initial-value: 0deg;
          }
          @keyframes spin-angle {
            to {
              --spin-angle: 1turn;
            }
          }
        `}</style>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="relative min-h-svh overflow-hidden px-6 py-10 text-sm text-[#a51f3b] dark:text-[#ff8aa3]">
        <div className="relative mx-auto flex min-h-[70svh] items-center justify-center">
          {error || "Something went wrong."}
        </div>
      </main>
    );
  }

  return (
    <SessionGate
      loading={sessionLoading}
      error={sessionError}
      loadingFallback={<GameSessionLoading />}
    >
      <main className="relative h-svh overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-slate-900 dark:text-slate-100">
      {currentStatus === "busted" && !isHost && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#ff3b52] text-center font-ballpill text-4xl font-bold uppercase tracking-[0.35em] text-white shadow-[inset_0_0_60px_rgba(0,0,0,0.25)] sm:text-5xl">
          Busted
        </div>
      )}

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pb-6 pt-0 sm:gap-6 sm:px-6 sm:pb-10 md:gap-4 md:pb-6">
        <div className="sticky top-0 z-40 -mx-4 border-b border-white/20 bg-transparent px-4 py-4 backdrop-blur-lg dark:border-white/5 sm:-mx-6 sm:px-6 md:py-3">
          <AppHeader
            rightSlot={
              <div className="flex items-center gap-2 rounded-full border-2 border-[#1f2b7a] bg-white/90 pl-3 pr-1 py-1 shadow-[0_12px_24px_rgba(31,43,122,0.2)] backdrop-blur dark:border-[#7ce7ff]/50 dark:bg-slate-950/70 sm:gap-3">
                <div className="max-w-[120px] truncate text-xs font-semibold text-[#1f2b7a] dark:text-[#7ce7ff] sm:max-w-none sm:text-sm">
                  {currentPlayer?.name ?? "Loading..."}
                </div>
                <div
                  className={`flex items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg ${getAvatarClass(
                    currentPlayer?.id ?? currentPlayer?.name ?? "you",
                    currentPlayer?.color,
                  )}`}
                  style={{
                    width: AVATAR_SIZE - 28,
                    height: AVATAR_SIZE - 28,
                  }}
                >
                  {getAvatarLabel(
                    currentPlayer?.name ?? "",
                    currentPlayer?.avatar ?? null,
                  )}
                </div>
              </div>
            }
          />
        </div>
        <div className="pt-2 sm:pt-4">

        {!allSubmitted && roundStateReady && (
          <div className="flex justify-center">
            <span className="rounded-full border-2 border-[#1f2b7a] bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1f2b7a] shadow-[0_10px_18px_rgba(31,43,122,0.2)] whitespace-nowrap dark:border-[#7ce7ff]/60 dark:bg-slate-950/70 dark:text-[#7ce7ff]">
              Round {roundIndex}
            </span>
          </div>
        )}

        {state === "ready" && !roundStateReady ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="rounded-full bg-gradient-to-r from-[#ff8cc3] via-[#ffd966] to-[#66e0ff] p-[3px] shadow-[0_18px_40px_-18px_rgba(255,107,153,0.5)] dark:from-[#6a2b7a] dark:via-[#f59e0b] dark:to-[#0b4a66] dark:shadow-[0_18px_40px_-18px_rgba(236,72,153,0.45)]">
              <div className="rounded-full bg-white/95 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.9)] dark:bg-slate-950/80 dark:text-slate-100">
                Syncing Round...
              </div>
            </div>
          </div>
        ) : allSubmitted ? (
          isGameOver ? (
            <section className="flex min-h-0 flex-1 flex-col items-center text-center">
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs font-black uppercase tracking-[0.45em] text-[#ff6b99] dark:text-pink-200">
                  Game Over
                </p>
                <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                  Final Results
                </h3>
                <span className="rounded-full border-2 border-orange-500 bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_rgba(255,107,153,0.25)] whitespace-nowrap dark:border-amber-300/70 dark:from-amber-200 dark:via-orange-400 dark:to-pink-500 dark:shadow-[0_10px_22px_rgba(236,72,153,0.35)]">
                  Final Round {roundIndex}
                </span>
              </div>

              {winner ? (
                <div className="mt-6 w-full max-w-3xl rounded-[32px] bg-gradient-to-r from-[#ff8cc3] via-[#ffd966] to-[#66e0ff] p-[4px] shadow-[0_30px_70px_-24px_rgba(255,107,153,0.55)] dark:from-[#6a2b7a] dark:via-[#f59e0b] dark:to-[#0b4a66] dark:shadow-[0_30px_70px_-24px_rgba(56,189,248,0.4)]">
                  <div className="flex flex-col items-center gap-4 rounded-[28px] bg-white/95 px-6 py-6 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.9)] dark:bg-slate-950/90 sm:px-8 sm:py-8">
                    <AvatarBubble
                      seed={winner.player_id}
                      name={winner.name}
                      size={96}
                      avatar={
                        players.find((player) => player.id === winner.player_id)
                          ?.avatar ?? null
                      }
                      color={
                        players.find((player) => player.id === winner.player_id)
                          ?.color ?? null
                      }
                    />
                    <div className="space-y-2">
                      <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                        {winner.name}
                      </p>
                      <p className="inline-flex rounded-full bg-[#ffedf3] px-4 py-1.5 text-xs font-black uppercase tracking-[0.35em] text-[#ff6b99] dark:bg-pink-500/20 dark:text-pink-200">
                        Champion
                      </p>
                    </div>
                    <div className="rounded-2xl border-2 border-orange-500 bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 px-6 py-4 text-center text-white shadow-[0_16px_32px_rgba(255,107,153,0.28)] dark:border-amber-300/70 dark:from-amber-200 dark:via-orange-400 dark:to-pink-500">
                      <p className="text-xs font-black uppercase tracking-[0.35em] text-white/80">
                        Score
                      </p>
                      <p className="text-4xl font-black leading-tight sm:text-5xl">
                        {winner.total_score}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex min-h-0 w-full max-w-3xl flex-1 flex-col text-left">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Leaderboard
                </p>
                <div className="mt-4 flex-1 pr-1">
                  <div className="grid gap-3">
                    {sortedTotals.map((player, index) => (
                      <div
                        key={player.player_id}
                        className="flex items-center justify-between gap-3 rounded-[22px] border-2 border-[#1f2b7a]/15 bg-white px-4 py-3 shadow-[0_10px_20px_rgba(31,43,122,0.1)] dark:border-[#7ce7ff]/35 dark:bg-slate-950/80 dark:shadow-[0_12px_22px_rgba(12,18,34,0.45)]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#1f2b7a]/40 text-xs font-semibold text-[#1f2b7a]/70 dark:border-[#7ce7ff]/40 dark:text-[#7ce7ff]/80">
                            {index + 1}
                          </div>
                          <AvatarBubble
                            seed={player.player_id}
                            name={player.name}
                            size={40}
                            avatar={
                              players.find(
                                (item) => item.id === player.player_id,
                              )?.avatar ?? null
                            }
                            color={
                              players.find(
                                (item) => item.id === player.player_id,
                              )?.color ?? null
                            }
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {player.name}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <div className="rounded-full border-2 border-orange-500 bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 px-4 py-2 text-center text-white shadow-[0_10px_22px_rgba(255,107,153,0.25)] dark:border-amber-300/70 dark:from-amber-200 dark:via-orange-400 dark:to-pink-500 dark:shadow-[0_10px_22px_rgba(236,72,153,0.35)]">
                            <p className="text-base font-black leading-tight">
                              {player.total_score}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="flex flex-col items-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <h3 className="text-2xl font-black uppercase tracking-[0.25em] text-slate-900 dark:text-slate-100 sm:text-3xl">
                  Round Summary
                </h3>
                <span className="rounded-full border-2 border-orange-500 bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-[0_10px_22px_rgba(255,107,153,0.25)] whitespace-nowrap dark:border-amber-300/70 dark:from-amber-200 dark:via-orange-400 dark:to-pink-500 dark:shadow-[0_10px_22px_rgba(236,72,153,0.35)]">
                  Round {roundIndex}
                </span>
              </div>
              <div className="mt-6 grid w-full gap-3">
                {sortedTotals.map((player) => {
                  const round = roundScores.find(
                    (score) => score.player_id === player.player_id,
                  );
                  const roundScore = round?.score ?? 0;
                  return (
                    <div
                      key={player.player_id}
                      className="flex items-center justify-between gap-3 rounded-[22px] border-2 border-[#1f2b7a]/15 bg-white px-3 py-3 shadow-[0_10px_20px_rgba(31,43,122,0.1)] dark:border-[#7ce7ff]/35 dark:bg-slate-950/70 dark:shadow-[0_12px_22px_rgba(12,18,34,0.45)] sm:px-4"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <AvatarBubble
                          seed={player.player_id}
                          name={player.name}
                          size={44}
                          avatar={
                            players.find(
                              (item) => item.id === player.player_id,
                            )?.avatar ?? null
                          }
                          color={
                            players.find(
                              (item) => item.id === player.player_id,
                            )?.color ?? null
                          }
                        />
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                            {player.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#ffedf3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff6b99] dark:bg-pink-500/15 dark:text-pink-200">
                              Round +{roundScore}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <div className="rounded-full border-2 border-orange-500 bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 px-4 py-2 text-center text-white shadow-[0_10px_22px_rgba(255,107,153,0.25)] dark:border-amber-300/70 dark:from-amber-200 dark:via-orange-400 dark:to-pink-500 dark:shadow-[0_10px_22px_rgba(236,72,153,0.35)]">
                          <p className="text-base font-black leading-tight">
                            {player.total_score}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )
        ) : null}

        {!allSubmitted && isHost && currentStatus === "busted" ? (
          <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 rounded-[28px] border-[3px] border-[#ff4f70] bg-white/90 px-6 py-8 text-center shadow-[0_25px_60px_rgba(255,79,112,0.25)] dark:border-[#ff87a0] dark:bg-slate-900/85 sm:px-10">
            <div className="text-xs font-semibold uppercase tracking-[0.4em] text-[#ff4f70] dark:text-[#ffb6c4]">
              Status
            </div>
            <div className="text-4xl font-semibold uppercase tracking-[0.35em] text-[#b01d3a] dark:text-[#ffb6c4] sm:text-5xl">
              Busted
            </div>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
              You&apos;re busted this round. Waiting on the rest of the table to
              submit scores.
            </p>
          </section>
        ) : (
          !allSubmitted && (
            <div
              className={`flex min-h-0 flex-1 flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:content-center ${
                hasSubmitted ? "lg:items-stretch" : "lg:items-center"
              }`}
            >
              <div
                className={`flex items-center justify-center ${
                  hasSubmitted ? "flex-1 lg:justify-center" : "lg:justify-start"
                }`}
              >
                <GameScoreDisplay
                  score={displayScore}
                  isFlip7Bonus={displayFlip7}
                  size={scoreSize}
                />
              </div>
              <div className="mt-auto flex flex-col gap-4 sm:gap-6 lg:mt-0">
                {!hasSubmitted && (
                  <div className="cards-panel cards-scale origin-top">
                    <GameCardGrid
                      numberCards={NUMBER_CARDS}
                      modifierCards={MODIFIER_CARDS}
                      selectedCards={selectedCards}
                      onToggleCard={toggleCard}
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSubmitScore}
                    disabled={hasSubmitted}
                    variant="gummyOrange"
                    className="flex-1 h-12 text-base uppercase tracking-[0.2em]"
                  >
                    {hasSubmitted
                      ? "Waiting for other players..."
                      : "Submit Score"}
                  </Button>
                  {isHost && (
                    <Drawer>
                      <DrawerTrigger asChild>
                        <Button
                          type="button"
                          variant="gummyBlue"
                          className="h-12 w-12 p-0"
                        >
                          <Users className="h-5 w-5" />
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent className="border-t-[3px] border-[#1f2b7a] bg-white shadow-[0_-25px_60px_rgba(31,43,122,0.28)] dark:border-[#7ce7ff] dark:bg-[#0f1729]">
                        <DrawerTitle className="sr-only">
                          Host Controls
                        </DrawerTitle>
                        <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+3.5rem)] pt-3">
                          <div className="pointer-events-none mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#1f2b7a]/20 dark:bg-[#7ce7ff]/30" />

                          <div className="space-y-3">
                            {players.map((player) => (
                              <div
                                key={player.id}
                                className="group flex items-center justify-between gap-4 rounded-[24px] border-2 border-[#1f2b7a] bg-white p-3 shadow-[0_8px_20px_rgba(31,43,122,0.12)] transition-all active:scale-[0.99] dark:border-[#7ce7ff]/40 dark:bg-slate-900"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <div className="relative">
                                    <AvatarBubble
                                      seed={player.id}
                                      name={player.name}
                                      size={44}
                                      avatar={player.avatar ?? null}
                                      color={player.color ?? null}
                                    />
                                    {player.id === hostPlayerId && (
                                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1f2b7a] dark:border-slate-900 dark:bg-[#7ce7ff]">
                                        <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-900" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`truncate text-base font-bold tracking-tight text-[#1f2b7a] dark:text-white ${
                                        player.status === "busted"
                                          ? "opacity-70"
                                          : ""
                                      }`}
                                    >
                                      {player.name}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      {player.id === hostPlayerId && (
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1f2b7a]/60 dark:text-[#7ce7ff]/70">
                                          Room Host
                                        </span>
                                      )}
                                      {player.status === "busted" && (
                                        <span className="inline-flex rounded-full border border-[#ff4f70]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b01d3a] dark:border-[#ff87a0]/50 dark:text-[#ffb6c4]">
                                          Busted
                                        </span>
                                      )}
                                      {player.status === "frozen" && (
                                        <span className="inline-flex rounded-full border border-[#46d2ff]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1f2b7a] dark:border-[#7ce7ff]/50 dark:text-[#cbefff]">
                                          Frozen
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => handleBustPlayer(player.id)}
                                    disabled={
                                      player.id === hostPlayerId ||
                                      player.status === "busted"
                                    }
                                    variant="gummyRed"
                                    className="h-10 px-5 text-[11px] tracking-wider"
                                  >
                                    Bust
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      handleFreezePlayer(player.id)
                                    }
                                    disabled={
                                      player.id === hostPlayerId ||
                                      player.status === "busted"
                                    }
                                    variant="gummyBlue"
                                    className="h-10 px-5 text-[11px] tracking-wider"
                                  >
                                    Freeze
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DrawerContent>
                    </Drawer>
                  )}
                </div>
              </div>
            </div>
          )
        )}

      </div>
      {isHost && !allSubmitted && currentStatus === "busted" && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
            <Button
              disabled
              variant="gummyOrange"
              className="flex-1 h-12 text-base uppercase tracking-[0.2em] opacity-80"
            >
              Waiting for other players...
            </Button>
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="gummyBlue"
                  className="h-12 w-12 p-0"
                >
                  <Users className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="border-t-[3px] border-[#1f2b7a] bg-white shadow-[0_-25px_60px_rgba(31,43,122,0.28)] dark:border-[#7ce7ff] dark:bg-[#0f1729]">
                <DrawerTitle className="sr-only">Host Controls</DrawerTitle>
                <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+3.5rem)] pt-3">
                  <div className="pointer-events-none mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#1f2b7a]/20 dark:bg-[#7ce7ff]/30" />

                  <div className="space-y-3">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="group flex items-center justify-between gap-4 rounded-[24px] border-2 border-[#1f2b7a] bg-white p-3 shadow-[0_8px_20px_rgba(31,43,122,0.12)] transition-all active:scale-[0.99] dark:border-[#7ce7ff]/40 dark:bg-slate-900"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="relative">
                            <AvatarBubble
                              seed={player.id}
                              name={player.name}
                              size={44}
                              avatar={player.avatar ?? null}
                              color={player.color ?? null}
                            />
                            {player.id === hostPlayerId && (
                              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1f2b7a] dark:border-slate-900 dark:bg-[#7ce7ff]">
                                <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-900" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-base font-bold tracking-tight text-[#1f2b7a] dark:text-white ${
                                player.status === "busted" ? "opacity-70" : ""
                              }`}
                            >
                              {player.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {player.id === hostPlayerId && (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1f2b7a]/60 dark:text-[#7ce7ff]/70">
                                  Room Host
                                </span>
                              )}
                              {player.status === "busted" && (
                                <span className="inline-flex rounded-full border border-[#ff4f70]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b01d3a] dark:border-[#ff87a0]/50 dark:text-[#ffb6c4]">
                                  Busted
                                </span>
                              )}
                              {player.status === "frozen" && (
                                <span className="inline-flex rounded-full border border-[#46d2ff]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1f2b7a] dark:border-[#7ce7ff]/50 dark:text-[#cbefff]">
                                  Frozen
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleBustPlayer(player.id)}
                            disabled={
                              player.id === hostPlayerId ||
                              player.status === "busted"
                            }
                            style={{ backgroundColor: "#ff4f70" }}
                            className="inline-flex h-10 items-center justify-center rounded-[18px] px-5 text-[11px] font-black uppercase tracking-wider text-white shadow-[0_6px_14px_rgba(255,79,112,0.4)] transition-all hover:brightness-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Bust
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFreezePlayer(player.id)}
                            disabled={
                              player.id === hostPlayerId ||
                              player.status === "busted"
                            }
                            style={{ backgroundColor: "#46d2ff" }}
                            className="inline-flex h-10 items-center justify-center rounded-[18px] px-5 text-[11px] font-black uppercase tracking-wider text-[#1f2b7a] shadow-[0_6px_14px_rgba(70,210,255,0.4)] transition-all hover:brightness-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Freeze
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      )}
      {allSubmitted && isHost && !isGameOver && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <div className="mx-auto w-full max-w-5xl">
            <Button
              onClick={handleNextRound}
              variant="gummyOrange"
              className="w-full h-12 text-base uppercase tracking-[0.2em]"
            >
              Start Next Round
            </Button>
          </div>
        </div>
      )}
      {allSubmitted && isHost && isGameOver && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <div className="mx-auto w-full max-w-5xl">
            <Button
              onClick={handlePlayAgain}
              disabled={isRematchStarting}
              variant="gummyOrange"
              className="w-full h-12 text-base uppercase tracking-[0.2em]"
            >
              {isRematchStarting ? "Creating Lobby..." : "Play Again"}
            </Button>
          </div>
        </div>
      )}
        </div>
      <style jsx>{`
        .cards-panel {
          max-height: calc(100dvh - 22rem);
        }


        @media (min-width: 630px) and (max-width: 1023px) and (max-height: 500px) {
          .cards-panel {
            max-height: calc(100dvh - 19rem);
          }

          .cards-scale {
            transform: scale(0.84);
            transform-origin: top center;
          }
        }

        @media (max-height: 900px) {
          .cards-scale {
            transform: scale(0.92);
          }
        }

        @media (max-height: 800px) {
          .cards-scale {
            transform: scale(0.94);
          }
        }

        @media (max-height: 720px) {
          .cards-scale {
            transform: scale(0.9);
          }
        }

        @media (max-height: 660px) {
          .cards-scale {
            transform: scale(0.86);
          }
        }
      `}</style>
    </main>
    </SessionGate>
  );
}
