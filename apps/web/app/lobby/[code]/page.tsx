"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/app-header";
import { SessionGate } from "@/components/session-gate";
import {
  AVATAR_SIZE,
  getAvatarClass,
  getInitials,
} from "@/components/lobby-player-bubbles";
import { LobbyPlayerOrbit } from "@/components/lobby-player-orbit";
import { useAnonSession } from "@/hooks/use-anon-session";

type LobbyState = "loading" | "needs-name" | "joining" | "ready" | "error";
type StoredPlayer = {
  gameId: string;
  playerId: string;
};

type Player = {
  id: string;
  name: string;
};

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [state, setState] = useState<LobbyState>("loading");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameId, setGameId] = useState("");
  const [currentPlayerId, setCurrentPlayerId] = useState("");
  const [hostPlayerId, setHostPlayerId] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const {
    session,
    error: sessionError,
    loading: sessionLoading,
    supabase: supabaseClient,
  } = useAnonSession();
  const publicUrl =
    process.env.NEXT_PUBLIC_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const code = useMemo(
    () => (typeof params.code === "string" ? params.code.toUpperCase() : ""),
    [params.code],
  );


  useEffect(() => {
    if (!code || sessionLoading) return;
    const supabase = supabaseClient;

    const init = async () => {
      setState("loading");

      const { data: gameData, error: gameError } = await supabase.rpc(
        "get_game_by_code",
        { p_code: code },
      );

      if (gameError || !gameData?.length) {
        setState("needs-name");
        return;
      }

      const game = gameData[0];
      setGameId(game.id);

      const { data: hostData } = await supabase
        .from("games")
        .select("host_player_id, status")
        .eq("id", game.id)
        .maybeSingle();

      if (hostData?.host_player_id) {
        setHostPlayerId(hostData.host_player_id);
      }

      if (hostData?.status === "active") {
        console.info("[lobby] game active, redirecting to game view");
        router.replace(`/game/${code}`);
        return;
      }

      const storedKey = `flip7_player_${code}`;
      const stored =
        typeof window !== "undefined"
          ? (localStorage.getItem(storedKey) ?? "")
          : "";
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StoredPlayer;
          if (parsed?.gameId === game.id && parsed?.playerId) {
            const { data: player } = await supabase
              .from("players")
              .select("id")
              .eq("id", parsed.playerId)
              .maybeSingle();
            if (player) {
              setCurrentPlayerId(parsed.playerId);
              await loadPlayers(game.id, supabase);
              setState("ready");
              return;
            }
          }
        } catch {
          // Ignore invalid local storage entries.
        }
        localStorage.removeItem(storedKey);
      }

      const userId = session?.user.id;
      if (userId) {
        const { data: existingPlayer } = await supabase
          .from("players")
          .select("id")
          .eq("game_id", game.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (existingPlayer?.id) {
          setCurrentPlayerId(existingPlayer.id);
          await loadPlayers(game.id, supabase);
          localStorage.setItem(
            storedKey,
            JSON.stringify({ gameId: game.id, playerId: existingPlayer.id }),
          );
          if (existingPlayer.id === hostData?.host_player_id) {
            localStorage.setItem(
              "flip7_host_lobby",
              JSON.stringify({
                gameId: game.id,
                code,
                playerId: existingPlayer.id,
              }),
            );
          }
          setState("ready");
          return;
        }
      }

      setState("needs-name");
    };

    init();
  }, [code, router, session, sessionLoading, supabaseClient]);

  useEffect(() => {
    if (!gameId || !currentPlayerId) return;
    const supabase = supabaseClient;

    const channel = supabase
      .channel(`lobby:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          console.info("[lobby] players updated, refreshing");
          loadPlayers(gameId, supabase);
        },
      )
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
          if (game?.host_player_id) {
            setHostPlayerId(game.host_player_id);
          }
          if (game?.status === "active") {
            console.info("[lobby] game active, redirecting to game view");
            router.replace(`/game/${code}`);
          }
        },
      )
      .subscribe((status) => {
        console.info("[lobby] channel status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, currentPlayerId, gameId, router, supabaseClient]);

  const loadPlayers = async (id: string, supabase = supabaseClient) => {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, name")
      .eq("game_id", id)
      .order("seat_order", { ascending: true });

    if (playersData) {
      setPlayers(playersData);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) return;
    setState("joining");
    const supabase = supabaseClient;

    const { data, error: joinError } = await supabase.rpc("join_game", {
      p_code: code,
      p_name: name.trim(),
      p_avatar: null,
      p_color: null,
    });

    if (joinError || !data?.length) {
      setState("error");
      setError(joinError?.message ?? "Failed to join lobby.");
      return;
    }

    const { game_id, player_id } = data[0];
    await loadPlayers(game_id, supabase);
    localStorage.setItem(
      `flip7_player_${code}`,
      JSON.stringify({ gameId: game_id, playerId: player_id }),
    );
    setCurrentPlayerId(player_id);
    setGameId(game_id);
    setState("ready");
  };

  const currentPlayer = players.find((player) => player.id === currentPlayerId);
  const isHost = currentPlayerId && hostPlayerId === currentPlayerId;

  const handleStartGame = async () => {
    if (!gameId || !isHost || players.length < 3) return;
    setIsStarting(true);
    const supabase = supabaseClient;
    const { error: startError } = await supabase.rpc("start_game", {
      p_game_id: gameId,
    });
    if (startError) {
      setError(startError.message);
      setState("error");
      setIsStarting(false);
      return;
    }
    const { error: roundError } = await supabase.rpc("create_round", {
      p_game_id: gameId,
    });
    if (roundError) {
      setError(roundError.message);
      setState("error");
      setIsStarting(false);
      return;
    }
    console.info("[lobby] start_game ok, redirecting");
    router.replace(`/game/${code}`);
  };

  return (
    <SessionGate loading={sessionLoading} error={sessionError}>
      <main className="relative min-h-svh overflow-hidden bg-[#f7f2e7] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,86,120,0.45),transparent_65%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(70,210,255,0.55),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute left-12 top-20 hidden h-32 w-32 rotate-6 rounded-3xl border-[3px] border-[#1f2b7a]/60 bg-white/70 shadow-[0_20px_45px_rgba(31,43,122,0.25)] lg:block dark:border-[#7ce7ff]/70 dark:bg-slate-900/60" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:py-14">
        <AppHeader />
        <header className="flex flex-col gap-6 rounded-[28px] border-[3px] border-[#1f2b7a] bg-white/85 p-6 shadow-[0_25px_60px_rgba(31,43,122,0.28)] backdrop-blur dark:border-[#7ce7ff] dark:bg-slate-900/80 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#ff4f70] dark:text-[#ff87a0]">
                7 Score Lobby
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {isHost
                  ? "Waiting for more players to join"
                  : "Waiting for the game to start"}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-200">
                {isHost
                  ? "Invite at least three players before starting."
                  : "Hang tight while the host gets the lobby ready."}
              </p>
            </div>
            {isHost && (
              <div className="rounded-full border-2 border-[#1f2b7a] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#1f2b7a] shadow-[0_10px_18px_rgba(31,43,122,0.2)] dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]">
                Code: <span className="font-semibold">{code || "----"}</span>
              </div>
            )}
          </div>
        </header>

        {state === "loading" && (
          <div className="rounded-2xl border-2 border-[#1f2b7a]/40 bg-white/80 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_12px_25px_-18px_rgba(31,43,122,0.25)] dark:border-[#7ce7ff]/60 dark:bg-slate-950/70 dark:text-[#7ce7ff]">
            Loading lobby...
          </div>
        )}

        {state === "error" && (
          <div className="rounded-2xl border-2 border-[#ff4f70] bg-[#ff4f70]/10 px-4 py-3 text-sm text-[#a51f3b] dark:border-[#ff87a0] dark:bg-[#ff87a0]/10 dark:text-[#ffd1db]">
            {error || "Something went wrong."}
          </div>
        )}

        {state === "needs-name" && (
          <section className="rounded-[28px] border-[3px] border-[#1f2b7a] bg-white/85 p-6 shadow-[0_25px_60px_rgba(31,43,122,0.28)] backdrop-blur dark:border-[#7ce7ff] dark:bg-slate-900/80 sm:p-8">
            <div className="flex flex-col gap-3">
              <Label
                htmlFor="player-name"
                className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1f2b7a] dark:text-[#7ce7ff] sm:text-sm"
              >
                Your Name
              </Label>
              <Input
                id="player-name"
                placeholder="Enter your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 rounded-full border-2 border-[#1f2b7a] bg-white/90 text-base text-slate-900 shadow-[0_10px_20px_rgba(31,43,122,0.18)] placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#ff4f70] dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-600 dark:text-slate-300">
                This is how others see you in the lobby.
              </p>
            </div>
            <div className="mt-6">
              <Button
                onClick={handleJoin}
                className="h-12 rounded-full border-2 border-[#1f2b7a] bg-gradient-to-r from-[#ff4f70] via-[#ffd04a] to-[#46d2ff] text-base font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_14px_25px_rgba(31,43,122,0.25)] hover:opacity-90 dark:border-[#7ce7ff] dark:text-slate-900"
              >
                Join Lobby
              </Button>
            </div>
          </section>
        )}

        {state === "ready" && (
          <section className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center justify-center gap-6 text-center">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:text-left">
                <div
                  className={`flex items-center justify-center rounded-full text-xl font-semibold text-white shadow-lg ${getAvatarClass(
                    currentPlayer?.id ?? currentPlayer?.name ?? "you",
                  )}`}
                  style={{
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                  }}
                >
                  {getInitials(currentPlayer?.name ?? "")}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">
                    {currentPlayer?.name ?? "Loading..."}
                  </h2>
                </div>
              </div>
              {currentPlayer?.id === hostPlayerId && (
                <span className="rounded-full border-2 border-[#1f2b7a] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_10px_18px_rgba(31,43,122,0.2)] dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]">
                  Host
                </span>
              )}
            </div>

            {isHost && (
              <div className="rounded-[28px] border-[3px] border-[#1f2b7a] bg-white/90 p-6 shadow-[0_25px_60px_rgba(31,43,122,0.28)] backdrop-blur dark:border-[#7ce7ff] dark:bg-slate-900/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ff4f70] dark:text-[#ff87a0]">
                      Lobby Code
                    </p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-[0.35em] text-[#1f2b7a] dark:text-[#7ce7ff]">
                      {code}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-200">
                      Share the QR or the code so friends can join quickly.
                    </p>
                  </div>
                  <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-[#1f2b7a]/60 bg-white p-4 shadow-[0_12px_25px_-18px_rgba(31,43,122,0.25)] dark:border-[#7ce7ff]/70">
                    <QRCodeSVG
                      value={`${publicUrl.replace(/\/$/, "")}/${code}`}
                      size={200}
                      bgColor="transparent"
                      fgColor="#1f2b7a"
                    />
                  </div>
                </div>
              </div>
            )}

            <LobbyPlayerOrbit
              players={players}
              currentPlayerId={currentPlayerId}
              hostPlayerId={hostPlayerId}
              isHost={isHost}
            />
          </section>
        )}
      </div>
      {isHost && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-6 pb-6">
          <div className="mx-auto w-full max-w-5xl">
            <Button
              onClick={handleStartGame}
              disabled={isStarting || players.length < 3}
              className="w-full rounded-full border-2 border-[#1f2b7a] bg-gradient-to-r from-[#ff4f70] via-[#ffd04a] to-[#46d2ff] text-base font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_14px_25px_rgba(31,43,122,0.25)] hover:opacity-90 disabled:opacity-70 dark:border-[#7ce7ff] dark:text-slate-900"
            >
              {isStarting ? "Starting..." : "Start Game"}
            </Button>
          </div>
        </div>
      )}
      </main>
    </SessionGate>
  );
}
