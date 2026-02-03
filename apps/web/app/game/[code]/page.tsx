"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { createClient } from "@/utils/supabase/client";
import { AppHeader } from "@/components/app-header";
import { GameCardGrid } from "@/components/game-card-grid";
import { GameScoreDisplay } from "@/components/game-score-display";

type GameState = "loading" | "ready" | "error";

type Player = {
  id: string;
  name: string;
  status?: "active" | "busted" | "frozen" | "stayed" | "left";
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

const AVATAR_SIZE = 64;

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

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 10000;
  }
  return hash;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase() || "--";
};

const getAvatarClass = (seed: string) => {
  const hash = hashSeed(seed);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const AvatarBubble = ({
  seed,
  name,
  size,
}: {
  seed: string;
  name: string;
  size: number;
}) => (
  <div
    className={`flex items-center justify-center rounded-full font-semibold text-white shadow-lg ${getAvatarClass(
      seed,
    )}`}
    style={{ width: size, height: size }}
  >
    <span
      className="leading-none"
      style={{ fontSize: Math.max(12, Math.floor(size / 2.4)) }}
    >
      {getInitials(name)}
    </span>
  </div>
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
  const [totals, setTotals] = useState<TotalScore[]>([]);
  const [isRematchStarting, setIsRematchStarting] = useState(false);
  const playersCountRef = useRef(0);
  const currentPlayerIdRef = useRef("");
  const currentRoundIdRef = useRef("");
  const channelRef = useRef<
    ReturnType<ReturnType<typeof createClient>["channel"]> | null
  >(null);
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
    if (!code) return;
    const supabase = createClient();

    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          setState("error");
          setError(authError.message);
          return;
        }
      }

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

      const stored = localStorage.getItem(`flip7_player_${code}`);
      if (!stored) {
        router.replace(`/lobby/${code}`);
        return;
      }
      const parsed = JSON.parse(stored) as { playerId: string; gameId: string };
      setCurrentPlayerId(parsed.playerId);

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
      await loadCurrentRound(game.id, supabase);
      await loadPlayers(game.id, parsed.playerId, supabase);
      setState("ready");
    };

    init();
  }, [code, router]);

  useEffect(() => {
    if (!gameId || !currentPlayerId) return;
    const supabase = createClient();
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
  }, [gameId, currentPlayerId, currentRoundId, router]);

  useEffect(() => {
    if (!gameId || !currentRoundId || allSubmitted) return;
    const supabase = createClient();
    const interval = setInterval(() => {
      refreshRoundState(supabase);
    }, 3000);
    return () => clearInterval(interval);
  }, [allSubmitted, currentRoundId, gameId]);

  useEffect(() => {
    if (!gameId || !allSubmitted) return;
    const supabase = createClient();
    const interval = setInterval(() => {
      loadCurrentRound(gameId, supabase);
    }, 4000);
    return () => clearInterval(interval);
  }, [allSubmitted, gameId]);

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
    supabase = createClient(),
  ) => {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, name, status")
      .eq("game_id", id)
      .order("seat_order", { ascending: true });
    setPlayers(playersData ?? []);
    const current = playersData?.find((player) => player.id === playerId);
    if (current) {
      setCurrentPlayer(current);
    }
  };

  const loadCurrentRound = async (id: string, supabase = createClient()) => {
    const { data: roundData } = await supabase.rpc("get_current_round", {
      p_game_id: id,
    });
    if (roundData?.length) {
      const nextRoundId = roundData[0].round_id;
      const nextRoundIndex = roundData[0].round_index;
      if (nextRoundId === currentRoundIdRef.current) {
        return;
      }
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
    supabase = createClient(),
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
    const supabase = createClient();
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
    const supabase = createClient();
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
    const supabase = createClient();
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
    const supabase = createClient();
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
    const supabase = createClient();
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
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

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

  if (state === "loading") {
    return (
      <main className="min-h-svh bg-[#f7f2e7] px-6 py-10 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-200">
        Loading game...
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="min-h-svh bg-[#f7f2e7] px-6 py-10 text-sm text-[#a51f3b] dark:bg-slate-950 dark:text-[#ffd1db]">
        {error || "Something went wrong."}
      </main>
    );
  }

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
  return (
    <main className="relative h-svh overflow-hidden bg-[#f7f2e7] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {currentStatus === "busted" && !isHost && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#ff3b52] text-center font-ballpill text-4xl font-bold uppercase tracking-[0.35em] text-white shadow-[inset_0_0_60px_rgba(0,0,0,0.25)] sm:text-5xl">
          Busted
        </div>
      )}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,86,120,0.45),transparent_65%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(70,210,255,0.55),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute left-10 top-20 hidden h-32 w-32 rotate-6 rounded-3xl border-[3px] border-[#1f2b7a]/60 bg-white/70 shadow-[0_20px_45px_rgba(31,43,122,0.25)] lg:block dark:border-[#7ce7ff]/70 dark:bg-slate-900/60" />

      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10 md:gap-4 md:py-6">
        <AppHeader
          rightSlot={
            <div className="flex items-center gap-2 rounded-full border-2 border-[#1f2b7a] bg-white/90 pl-3 pr-1 py-1 shadow-[0_12px_24px_rgba(31,43,122,0.2)] backdrop-blur dark:border-[#7ce7ff] dark:bg-slate-950/70 sm:gap-3">
              <div className="max-w-[120px] truncate text-xs font-semibold text-[#1f2b7a] dark:text-[#7ce7ff] sm:max-w-none sm:text-sm">
                {currentPlayer?.name ?? "Loading..."}
              </div>
              <div
                className={`flex items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg ${getAvatarClass(
                  currentPlayer?.id ?? currentPlayer?.name ?? "you",
                )}`}
                style={{
                  width: AVATAR_SIZE - 28,
                  height: AVATAR_SIZE - 28,
                }}
              >
                {getInitials(currentPlayer?.name ?? "")}
              </div>
            </div>
          }
        />

        {!allSubmitted && (
          <div className="flex justify-center">
            <span className="rounded-full border-2 border-[#1f2b7a] bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#1f2b7a] shadow-[0_10px_18px_rgba(31,43,122,0.2)] dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]">
              Round {roundIndex}
            </span>
          </div>
        )}

        {allSubmitted ? (
          isGameOver ? (
            <section className="relative flex min-h-0 flex-1 flex-col rounded-[32px] border-[3px] border-[#1f2b7a] bg-white/90 p-6 shadow-[0_30px_70px_rgba(31,43,122,0.3)] dark:border-[#7ce7ff] dark:bg-slate-900/80 sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,208,74,0.65),transparent_70%)] blur-2xl" />
              <div className="pointer-events-none absolute -bottom-24 left-4 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(70,210,255,0.4),transparent_70%)] blur-3xl" />

              <div className="relative flex min-h-0 flex-1 flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#1f2b7a]/70 dark:text-[#7ce7ff]/80">
                      Game Over
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">
                      Winner
                    </h3>
                  </div>
                  <div className="rounded-full border-2 border-[#1f2b7a] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1f2b7a] shadow-[0_10px_18px_rgba(31,43,122,0.2)] dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]">
                    Final Round {roundIndex}
                  </div>
                </div>

                {winner ? (
                  <div className="flex flex-col gap-4 rounded-[28px] border-[3px] border-[#ffb938] bg-white/90 px-5 py-5 shadow-[0_20px_35px_rgba(255,185,56,0.35)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-[#ffe08a] dark:bg-slate-950/70">
                    <div className="flex items-center gap-4">
                      <AvatarBubble
                        seed={winner.player_id}
                        name={winner.name}
                        size={72}
                      />
                      <div>
                        <p className="text-xl font-semibold sm:text-2xl">
                          {winner.name}
                        </p>
                        <p className="mt-1 inline-flex rounded-full border border-[#1f2b7a]/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#1f2b7a]/70 dark:border-[#7ce7ff]/40 dark:text-[#7ce7ff]/70">
                          Champion
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border-2 border-[#1f2b7a] bg-white/80 px-5 py-4 text-center text-[#1f2b7a] shadow-[0_12px_22px_rgba(31,43,122,0.18)] dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1f2b7a]/60 dark:text-[#7ce7ff]/70">
                        Final
                      </p>
                      <p className="text-3xl font-semibold leading-tight sm:text-4xl">
                        {winner.total_score}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1f2b7a]/60 dark:text-[#7ce7ff]/70">
                        Points
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="flex min-h-0 flex-1 flex-col">
                  <p className="text-sm font-semibold text-[#1f2b7a] dark:text-[#7ce7ff]">
                    Leaderboard
                  </p>
                  <div className="mt-4 flex-1 overflow-y-auto overscroll-contain pr-1">
                    <div className="grid gap-3">
                      {sortedTotals.map((player, index) => (
                        <div
                          key={player.player_id}
                          className="flex items-center justify-between rounded-2xl border-2 border-[#1f2b7a] bg-white/90 px-4 py-3 shadow-[0_10px_20px_rgba(31,43,122,0.15)] dark:border-[#7ce7ff] dark:bg-slate-950/70"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#1f2b7a]/40 text-xs font-semibold text-[#1f2b7a]/70 dark:border-[#7ce7ff]/40 dark:text-[#7ce7ff]/80">
                              {index + 1}
                            </div>
                            <AvatarBubble
                              seed={player.player_id}
                              name={player.name}
                              size={40}
                            />
                            <div>
                              <p className="font-medium">{player.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              Score
                            </p>
                            <p className="text-lg font-semibold">
                              {player.total_score}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-[28px] border-[3px] border-[#1f2b7a] bg-white/90 p-6 shadow-[0_25px_60px_rgba(31,43,122,0.28)] dark:border-[#7ce7ff] dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Round Summary</h3>
                <p className="text-sm text-slate-600 dark:text-slate-200">
                  Round {roundIndex}
                </p>
              </div>
              <div className="mt-6 grid gap-3">
                {sortedTotals.map((player) => {
                  const round = roundScores.find(
                    (score) => score.player_id === player.player_id,
                  );
                  return (
                    <div
                      key={player.player_id}
                      className="flex items-center justify-between rounded-2xl border-2 border-[#1f2b7a] bg-white px-4 py-3 shadow-[0_10px_20px_rgba(31,43,122,0.15)] dark:border-[#7ce7ff] dark:bg-slate-950/70"
                    >
                      <div className="flex items-center gap-3">
                        <AvatarBubble
                          seed={player.player_id}
                          name={player.name}
                          size={40}
                        />
                        <div>
                          <p className="font-medium">{player.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Round score: {round?.score ?? 0}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Total
                        </p>
                        <p className="text-lg font-semibold">
                          {player.total_score}
                        </p>
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
                    className="flex-1 rounded-full border-2 border-[#1f2b7a] bg-gradient-to-r from-[#ff4f70] via-[#ffd04a] to-[#46d2ff] text-base font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_14px_25px_rgba(31,43,122,0.25)] hover:opacity-90 disabled:opacity-70 dark:border-[#7ce7ff] dark:text-slate-900"
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
                          className="h-12 w-12 rounded-full border-2 border-[#1f2b7a] bg-white p-0 text-[#1f2b7a] shadow-[0_12px_22px_rgba(31,43,122,0.18)] hover:bg-white/80 dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]"
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
                                  <button
                                    type="button"
                                    onClick={() => handleBustPlayer(player.id)}
                                    disabled={
                                      player.id === hostPlayerId ||
                                      player.status === "busted"
                                    }
                                    style={{ backgroundColor: '#ff4f70' }}
                                    className="inline-flex h-10 items-center justify-center rounded-[18px] px-5 text-[11px] font-black uppercase tracking-wider text-white shadow-[0_6px_14px_rgba(255,79,112,0.4)] transition-all hover:brightness-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Bust
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleFreezePlayer(player.id)
                                    }
                                    disabled={
                                      player.id === hostPlayerId ||
                                      player.status === "busted"
                                    }
                                    style={{ backgroundColor: '#46d2ff' }}
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
              className="flex-1 rounded-full border-2 border-[#1f2b7a] bg-gradient-to-r from-[#ff4f70] via-[#ffd04a] to-[#46d2ff] text-base font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_14px_25px_rgba(31,43,122,0.25)] opacity-80 dark:border-[#7ce7ff] dark:text-slate-900"
            >
              Waiting for other players...
            </Button>
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  className="h-12 w-12 rounded-full border-2 border-[#1f2b7a] bg-white p-0 text-[#1f2b7a] shadow-[0_12px_22px_rgba(31,43,122,0.18)] hover:bg-white/80 dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]"
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
              className="w-full rounded-full border-2 border-[#1f2b7a] bg-gradient-to-r from-[#ff4f70] via-[#ffd04a] to-[#46d2ff] text-base font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_14px_25px_rgba(31,43,122,0.25)] hover:opacity-90 dark:border-[#7ce7ff] dark:text-slate-900"
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
              className="w-full rounded-full border-2 border-[#1f2b7a] bg-gradient-to-r from-[#ff4f70] via-[#ffd04a] to-[#46d2ff] text-base font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_14px_25px_rgba(31,43,122,0.25)] hover:opacity-90 disabled:opacity-70 dark:border-[#7ce7ff] dark:text-slate-900"
            >
              {isRematchStarting ? "Creating Lobby..." : "Play Again"}
            </Button>
          </div>
        </div>
      )}
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
  );
}
