"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import * as motion from "motion/react-client";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@workspace/ui/components/drawer";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/app-header";
import { SessionGate } from "@/components/session-gate";
import { getAvatarClass } from "@/components/lobby-player-bubbles";
import { type LayoutMode } from "@/components/lobby-orbit-layout";
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
  avatar?: string | null;
  color?: string | null;
};

type StoredProfile = {
  name: string;
  avatar: string | null;
  color: string | null;
};

const LobbySessionLoading = () => (
  <main className="relative min-h-svh overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-slate-900">
    <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_2px_2px,rgba(79,70,229,0.18)_2px,transparent_0)] [background-size:24px_24px]" />
    <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#ff99b8]/40 to-[#ffd966]/40 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-gradient-to-bl from-[#66e0ff]/40 to-[#ff99b8]/40 blur-3xl" />
    <div className="relative mx-auto flex min-h-svh w-full max-w-5xl flex-col items-center justify-center gap-6 px-5 pb-24 pt-6 sm:px-10 sm:pb-28 sm:pt-10 lg:px-16">
      <div className="rounded-full bg-gradient-to-r from-[#ff8cc3] via-[#ffd966] to-[#66e0ff] p-[3px] shadow-[0_18px_40px_-18px_rgba(255,107,153,0.5)]">
        <div className="rounded-full bg-white/95 px-6 py-3 text-sm font-black uppercase tracking-[0.25em] text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.9)]">
          Setting up lobby...
        </div>
      </div>
    </div>
  </main>
);

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
  const [isHostDrawerOpen, setIsHostDrawerOpen] = useState(true);
  const [qrSize, setQrSize] = useState(260);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileColor, setProfileColor] = useState<string | null>(null);
  const [hasStoredProfile, setHasStoredProfile] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("orbit");
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
          ? sessionStorage.getItem(storedKey) ??
            localStorage.getItem(storedKey) ??
            ""
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
          // Ignore invalid storage entries.
        }
        try {
          sessionStorage.removeItem(storedKey);
          localStorage.removeItem(storedKey);
        } catch {
          // Ignore storage failures.
        }
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
          try {
            const value = JSON.stringify({
              gameId: game.id,
              playerId: existingPlayer.id,
            });
            sessionStorage.setItem(storedKey, value);
            localStorage.setItem(storedKey, value);
          } catch {
            // Ignore storage failures.
          }
          if (existingPlayer.id === hostData?.host_player_id) {
            try {
              const hostValue = JSON.stringify({
                gameId: game.id,
                code,
                playerId: existingPlayer.id,
              });
              sessionStorage.setItem("flip7_host_lobby", hostValue);
              localStorage.setItem("flip7_host_lobby", hostValue);
            } catch {
              // Ignore storage failures.
            }
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const next = Math.min(
        360,
        Math.max(220, Math.floor(Math.min(width * 0.8, height * 0.6))),
      );
      setQrSize(next);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored =
      sessionStorage.getItem("flip7_profile") ??
      localStorage.getItem("flip7_profile");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as StoredProfile;
      if (parsed?.name) {
        setProfileName(parsed.name);
        setProfileAvatar(parsed.avatar ?? null);
        setProfileColor(parsed.color ?? null);
        setHasStoredProfile(true);
      }
    } catch {
      try {
        sessionStorage.removeItem("flip7_profile");
        localStorage.removeItem("flip7_profile");
      } catch {
        // Ignore storage failures.
      }
    }
  }, []);

  const loadPlayers = async (id: string, supabase = supabaseClient) => {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, name, avatar, color")
      .eq("game_id", id)
      .order("seat_order", { ascending: true });

    if (playersData) {
      setPlayers(playersData);
    }
  };

  const handleJoin = async () => {
    const nextName = profileName.trim();
    if (!nextName) return;
    setState("joining");
    const supabase = supabaseClient;

    const { data, error: joinError } = await supabase.rpc("join_game", {
      p_code: code,
      p_name: nextName,
      p_avatar: profileAvatar,
      p_color: profileColor,
    });

    if (joinError || !data?.length) {
      setState("error");
      setError(joinError?.message ?? "Failed to join lobby.");
      return;
    }

    const { game_id, player_id } = data[0];
    await loadPlayers(game_id, supabase);
    try {
      const playerValue = JSON.stringify({
        gameId: game_id,
        playerId: player_id,
      });
      sessionStorage.setItem(`flip7_player_${code}`, playerValue);
      localStorage.setItem(`flip7_player_${code}`, playerValue);
      const profileValue = JSON.stringify({
        name: nextName,
        avatar: profileAvatar ?? null,
        color: profileColor ?? null,
      } satisfies StoredProfile);
      sessionStorage.setItem("flip7_profile", profileValue);
      localStorage.setItem("flip7_profile", profileValue);
    } catch {
      // Ignore storage failures.
    }
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

  const openProfileDrawer = () => {
    if (!currentPlayer) return;
    setProfileName(currentPlayer.name ?? "");
    setProfileAvatar(currentPlayer.avatar ?? null);
    setProfileColor(currentPlayer.color ?? null);
    setIsProfileDrawerOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!currentPlayerId) return;
    const nextName = profileName.trim();
    if (!nextName) return;

    const supabase = supabaseClient;
    const { error: updateError } = await supabase
      .from("players")
      .update({
        name: nextName,
        avatar: profileAvatar,
        color: profileColor,
      })
      .eq("id", currentPlayerId);
    if (updateError) {
      setError(updateError.message);
      setState("error");
      return;
    }

    setPlayers((prev) =>
      prev.map((player) =>
        player.id === currentPlayerId
          ? {
              ...player,
              name: nextName,
              avatar: profileAvatar,
              color: profileColor,
            }
          : player,
      ),
    );
    try {
      const profileValue = JSON.stringify({
        name: nextName,
        avatar: profileAvatar ?? null,
        color: profileColor ?? null,
      } satisfies StoredProfile);
      sessionStorage.setItem("flip7_profile", profileValue);
      localStorage.setItem("flip7_profile", profileValue);
    } catch {
      // Ignore storage failures.
    }
    setIsProfileDrawerOpen(false);
  };

  const handleEditProfile = () => {
    setProfileName("");
    setProfileAvatar(null);
    setProfileColor(null);
    setHasStoredProfile(false);
    try {
      sessionStorage.removeItem("flip7_profile");
      localStorage.removeItem("flip7_profile");
    } catch {
      // Ignore storage failures.
    }
  };

  const avatarOptions = ["😎", "🤠", "🦊", "🐼", "🦄", "🐙", "⭐️", "👾"];
  const colorOptions = [
    { key: "pink", label: "Pink" },
    { key: "orange", label: "Orange" },
    { key: "blue", label: "Blue" },
    { key: "teal", label: "Teal" },
    { key: "purple", label: "Purple" },
    { key: "magenta", label: "Magenta" },
    { key: "yellow", label: "Yellow" },
    { key: "cyan", label: "Cyan" },
  ];

  const hostName =
    players.find((player) => player.id === hostPlayerId)?.name ?? "the host";

  return (
    <SessionGate
      loading={sessionLoading}
      error={sessionError}
      loadingFallback={<LobbySessionLoading />}
    >
      <main className="relative h-svh overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-slate-900">
        <div className="relative mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-5 pb-24 pt-0 sm:px-10 sm:pb-28 lg:px-16">
          <div className="sticky top-0 z-40 -mx-5 border-b border-white/20 bg-transparent px-5 py-4 backdrop-blur-lg sm:-mx-10 sm:px-10 md:py-3 lg:-mx-16 lg:px-16">
            <AppHeader />
          </div>
          <div className="pt-2 sm:pt-4">
          {state !== "needs-name" && (
            <header className="relative mx-auto w-full max-w-md pb-10 text-center">
              <div className="relative rounded-[36px] bg-gradient-to-r from-[#ff8cc3] via-[#ffd966] to-[#66e0ff] p-[5px] shadow-[0_30px_65px_-18px_rgba(255,107,153,0.6)]">
                <div className="relative rounded-[31px] bg-white/95 px-7 py-7 shadow-[inset_0_3px_0_rgba(255,255,255,0.9)] sm:px-8 sm:py-8">
                  <div className="pointer-events-none absolute inset-0 rounded-[31px] bg-gradient-to-b from-white/90 via-white/35 to-transparent opacity-90" />
                  <div className="pointer-events-none absolute left-5 right-5 top-3.5 h-4 rounded-full bg-white/75 blur-[1px]" />

                  <div className="relative z-10 space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                      {isHost
                        ? "Waiting for players..."
                        : `Waiting on ${hostName} to start...`}
                    </h1>
                    <p className="text-base font-medium text-slate-600">
                      {isHost
                        ? "Invite at least three players to start."
                        : "Hang tight! The game will begin shortly."}
                    </p>
                  </div>
                </div>
              </div>
            </header>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-6">
            {state === "loading" && (
              <div className="flex flex-1 items-center justify-center">
                <div className="rounded-full bg-gradient-to-r from-[#ff8cc3] via-[#ffd966] to-[#66e0ff] p-[3px] shadow-[0_18px_40px_-18px_rgba(255,107,153,0.5)]">
                  <div className="rounded-full bg-white/95 px-6 py-3 text-sm font-black uppercase tracking-[0.25em] text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.9)]">
                    Loading Lobby...
                  </div>
                </div>
              </div>
            )}

            {state === "error" && (
              <div className="rounded-2xl bg-[#ff6b99]/10 px-4 py-3 text-sm font-medium text-[#ff6b99] ring-4 ring-[#ff6b99]/20">
                {error || "Something went wrong."}
              </div>
            )}

            {state === "needs-name" && (
              <div className="flex flex-1 items-center justify-center text-sm font-medium text-slate-500">
                Choose your name and avatar below.
              </div>
            )}

            {state === "ready" && (
              <section className="flex min-h-0 flex-1 flex-col gap-4">
                <LobbyPlayerOrbit
                  players={players}
                  currentPlayerId={currentPlayerId}
                  hostPlayerId={hostPlayerId}
                  isHost={isHost}
                  onOpenProfile={openProfileDrawer}
                  layoutMode={layoutMode}
                />
              </section>
            )}
          </div>
          </div>
        </div>

        {isHost && (
          <>
            <Drawer open={isHostDrawerOpen} onOpenChange={setIsHostDrawerOpen}>
              <DrawerContent className="rounded-t-[32px] border-0 border-t-0 bg-white/95 p-6 pb-8 shadow-[0_20px_50px_rgba(255,107,153,0.2)] sm:p-8 [&>div:first-child]:hidden before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[10px] before:rounded-t-[32px] before:bg-[linear-gradient(90deg,#ff6b99,#ffd966,#66e0ff,#a855f7,#ff6b99)]">
                <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
                  <DrawerTitle className="sr-only">Lobby code</DrawerTitle>
                  <div className="flex w-full flex-col items-center gap-4">
                    <div className="flex w-full items-center justify-center rounded-3xl border-2 border-dashed border-[#ff6b99]/40 bg-white p-4 shadow-[0_12px_25px_-18px_rgba(255,107,153,0.25)] ring-2 ring-white/70">
                      <QRCodeSVG
                        value={`${publicUrl.replace(/\/$/, "")}/${code}`}
                        size={qrSize}
                        bgColor="transparent"
                        fgColor="#000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#ff6b99]">
                        Lobby Code
                      </p>
                      <h3 className="text-3xl font-black tracking-[0.35em] text-slate-900">
                        {code
                          ? `${code.slice(0, 2)}-${code.slice(2, 4)}-${code.slice(
                              4,
                              6,
                            )}`
                          : "------"}
                      </h3>
                      <p className="text-sm text-slate-600">
                        Share the QR or the code so friends can join quickly.
                      </p>
                    </div>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            <div className="fixed inset-x-0 bottom-0 z-40 px-6 pb-6">
              <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
                <motion.div
                  animate={players.length < 3 ? { y: [0, -12, 0] } : { y: 0 }}
                  transition={
                    players.length < 3
                      ? {
                          duration: 0.5,
                          times: [0, 0.5, 1],
                          repeat: Infinity,
                          repeatDelay: 1.5,
                        }
                      : { duration: 0 }
                  }
                >
                  <Button
                    type="button"
                    variant="gummyBlue"
                    onClick={() => setIsHostDrawerOpen((prev) => !prev)}
                    className="h-12 w-12 shrink-0"
                    aria-label="Toggle lobby code drawer"
                  >
                    <QrCode className="h-6 w-6 stroke-[3]" />
                  </Button>
                </motion.div>
                <Button
                  onClick={handleStartGame}
                  disabled={isStarting || players.length < 3}
                  variant="gummyOrange"
                  className="h-12 flex-1 min-w-0 text-base"
                >
                  {isStarting
                    ? "Starting..."
                    : players.length < 3
                      ? `Waiting for ${3 - players.length} more player${
                          3 - players.length === 1 ? "" : "s"
                        }...`
                      : "Start Game"}
                </Button>
              </div>
            </div>
          </>
        )}

        <Drawer
          open={isProfileDrawerOpen || state === "needs-name"}
          onOpenChange={(open) => {
            if (state === "needs-name") {
              setIsProfileDrawerOpen(true);
              return;
            }
            setIsProfileDrawerOpen(open);
          }}
        >
          <DrawerContent className="rounded-t-[32px] border-0 bg-white/95 p-6 pb-8 pt-12 shadow-[0_20px_50px_rgba(255,107,153,0.2)] sm:p-8 sm:pt-14 [&>div:first-child]:hidden before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[10px] before:rounded-t-[32px] before:bg-[linear-gradient(90deg,#ff6b99,#ffd966,#66e0ff,#a855f7,#ff6b99)]">
            <div className="mx-auto flex w-full max-w-md flex-col gap-6">
              <DrawerTitle className="sr-only">Edit profile</DrawerTitle>
              <div className="relative -mt-12 flex justify-center sm:-mt-16">
                <div
                  className={`relative flex h-24 w-24 items-center justify-center rounded-full text-4xl font-semibold text-white shadow-[0_18px_40px_rgba(255,107,153,0.25)] ring-4 ring-white/80 ${getAvatarClass(
                    currentPlayer?.id ?? profileName ?? "you",
                    profileColor,
                  )}`}
                >
                  <span className="pointer-events-none absolute left-[18%] top-[18%] h-[38%] w-[38%] rounded-full bg-white/20 blur-[1px]" />
                  <span className={profileAvatar ? "text-4xl leading-none" : "text-2xl"}>
                    {profileAvatar || (profileName ? profileName.slice(0, 2).toUpperCase() : "--")}
                  </span>
                </div>
              </div>

              {state === "needs-name" && hasStoredProfile ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    We’ll use your saved profile to join quickly.
                  </p>
                  <button
                    type="button"
                    onClick={handleEditProfile}
                    className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff6b99] underline decoration-[#ff6b99]/40 decoration-2 underline-offset-4"
                  >
                    Edit Profile
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label
                      htmlFor="profile-name"
                      className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff6b99] sm:text-sm"
                    >
                      Your Name
                    </Label>
                    <Input
                      id="profile-name"
                      placeholder="Enter your name"
                      value={profileName}
                      onChange={(event) => {
                        setProfileName(event.target.value);
                        if (hasStoredProfile) setHasStoredProfile(false);
                      }}
                      className="h-12 rounded-full border-0 bg-white text-base font-semibold text-slate-900 shadow-[inset_0_4px_8px_rgba(0,0,0,0.05)] ring-4 ring-[#ff6b99]/20 placeholder:text-slate-400 focus-visible:ring-[#66e0ff]"
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff6b99] sm:text-sm">
                      Avatar
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {avatarOptions.map((avatar) => (
                        <button
                          key={avatar}
                          type="button"
                          onClick={() => {
                            setProfileAvatar(avatar);
                            if (hasStoredProfile) setHasStoredProfile(false);
                          }}
                          className={`flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-[0_8px_18px_rgba(0,0,0,0.08)] ring-4 ring-white/70 ${
                            profileAvatar === avatar ? "border-2 border-black" : ""
                          }`}
                        >
                          {avatar}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff6b99] sm:text-sm">
                      Color
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {colorOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            setProfileColor(option.key);
                            if (hasStoredProfile) setHasStoredProfile(false);
                          }}
                          className={`h-10 w-10 rounded-full ring-4 ring-white/70 ${
                            profileColor === option.key ? "border-2 border-black" : ""
                          } ${getAvatarClass(option.key, option.key)}`}
                          aria-label={option.label}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <DrawerFooter className="px-0">
                <Button
                  onClick={state === "needs-name" ? handleJoin : handleSaveProfile}
                  variant="gummyOrange"
                  className="h-12 w-full text-base"
                >
                  {state === "needs-name"
                    ? hasStoredProfile
                      ? `Join as ${profileName}?`
                      : `Join ${hostName}'s Lobby`
                    : "Save Profile"}
                </Button>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </main>
    </SessionGate>
  );
}
