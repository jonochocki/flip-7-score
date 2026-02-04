"use client";

import { type ElementType, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Clock, Gamepad2, LogIn, Trophy, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@workspace/ui/components/drawer";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@workspace/ui/components/input-otp";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { SessionGate } from "@/components/session-gate";
import { useAnonSession } from "@/hooks/use-anon-session";
import { cn } from "@workspace/ui/lib/utils";

type StoredHostLobby = {
  gameId: string;
  code: string;
  playerId: string;
};

type InfoPillProps = {
  icon: ElementType;
  label: string;
  color: string;
  bg: string;
};

const HomeSessionLoading = () => (
  <main className="relative min-h-svh overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-slate-900">
    <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_2px_2px,rgba(79,70,229,0.18)_2px,transparent_0)] [background-size:24px_24px]" />
    <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#ff99b8]/40 to-[#ffd966]/40 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-gradient-to-bl from-[#66e0ff]/40 to-[#ff99b8]/40 blur-3xl" />
    <div className="relative mx-auto flex min-h-svh w-full max-w-5xl flex-col items-center justify-center gap-6 px-5 pb-24 pt-6 sm:px-10 sm:pb-28 sm:pt-10 lg:px-16">
      <div className="rounded-full bg-gradient-to-r from-[#ff8cc3] via-[#ffd966] to-[#66e0ff] p-[3px] shadow-[0_18px_40px_-18px_rgba(255,107,153,0.5)]">
        <div className="rounded-full bg-white/95 px-6 py-3 text-sm font-black uppercase tracking-[0.25em] text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.9)]">
          Setting up game...
        </div>
      </div>
    </div>
  </main>
);

export default function Page() {
  const [isJoinDrawerOpen, setIsJoinDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [lobbyCode, setLobbyCode] = useState("");
  const [hostName, setHostName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const {
    error: sessionError,
    loading: sessionLoading,
    supabase: supabaseClient,
  } = useAnonSession();

  

  const handleCreateLobby = async () => {
    if (!hostName.trim() || isCreating) return;
    setCreateError("");
    setIsCreating(true);

    if (sessionLoading) {
      setCreateError("Setting up your session. Try again in a moment.");
      setIsCreating(false);
      return;
    }
    if (sessionError) {
      setCreateError(sessionError);
      setIsCreating(false);
      return;
    }

    const supabase = supabaseClient;
    const stored =
      typeof window !== "undefined"
        ? sessionStorage.getItem("flip7_host_lobby") ??
          localStorage.getItem("flip7_host_lobby") ??
          ""
        : "";

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredHostLobby;
        if (parsed?.gameId && parsed?.code && parsed?.playerId) {
          const { data: existingGame } = await supabase
            .from("games")
            .select("id, code, status")
            .eq("id", parsed.gameId)
            .maybeSingle();

          if (existingGame && existingGame.status !== "finished") {
            const { error: updateError } = await supabase
              .from("players")
              .update({ name: hostName.trim() })
              .eq("id", parsed.playerId);
            if (updateError) {
              setCreateError(updateError.message);
              setIsCreating(false);
              return;
            }
            router.push(`/lobby/${existingGame.code}`);
            return;
          }
        }
      } catch {
        // Ignore invalid local storage entries.
      }
      try {
        sessionStorage.removeItem("flip7_host_lobby");
        localStorage.removeItem("flip7_host_lobby");
      } catch {
        // Ignore storage failures.
      }
    }

    const { data, error: rpcError } = await supabase.rpc("create_game", {
      p_name: hostName.trim(),
      p_avatar: null,
      p_color: null,
    });

    if (rpcError || !data?.length) {
      setCreateError(rpcError?.message ?? "Failed to create game.");
      setIsCreating(false);
      return;
    }

    const created = data[0];
    try {
      const hostValue = JSON.stringify({
        gameId: created.game_id,
        code: created.code,
        playerId: created.player_id,
      });
      sessionStorage.setItem("flip7_host_lobby", hostValue);
      localStorage.setItem("flip7_host_lobby", hostValue);
      const playerValue = JSON.stringify({
        gameId: created.game_id,
        playerId: created.player_id,
      });
      sessionStorage.setItem(`flip7_player_${created.code}`, playerValue);
      localStorage.setItem(`flip7_player_${created.code}`, playerValue);
    } catch {
      // Ignore storage failures.
    }
    router.push(`/lobby/${created.code}`);
  };

  return (
    <SessionGate
      loading={sessionLoading}
      error={sessionError}
      loadingFallback={<HomeSessionLoading />}
    >
      <main className="relative min-h-svh w-full overflow-hidden font-sans">

        <div className="relative z-10 flex min-h-svh w-full flex-col justify-center gap-10 px-5 py-6 sm:px-10 sm:py-10 lg:px-16">
          <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <section className="space-y-6 text-center lg:text-left">
              <div className="flex flex-col items-center space-y-3 lg:items-start">
                <Image
                  src="/assets/img/7-score-logo.png"
                  alt="7 Score"
                  width={520}
                  height={180}
                  className="h-32 w-auto object-contain sm:h-20"
                  priority
                />
                <p className="text-base font-bold uppercase tracking-[0.3em] text-indigo-300">
                  Press Your Luck
                </p>
              </div>

              <p className="mx-auto max-w-xl text-lg text-slate-600 lg:mx-0 lg:text-xl">
                Start a new lobby or jump into a friend&apos;s game with a quick
                code scan.
              </p>

              <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
                <InfoPill
                  icon={Trophy}
                  label="Race to 200"
                  color="text-white"
                  bg="border-amber-500 bg-gradient-to-b from-amber-300 via-orange-400 to-amber-500 shadow-[0_8px_0_rgba(180,95,20,0.35),0_16px_28px_rgba(255,166,92,0.25)]"
                />
                <InfoPill
                  icon={Users}
                  label="3+ Players"
                  color="text-white"
                  bg="border-sky-600 bg-gradient-to-b from-sky-300 via-sky-500 to-blue-600 shadow-[0_8px_0_rgba(30,110,170,0.35),0_16px_28px_rgba(96,165,250,0.25)]"
                />
                <InfoPill
                  icon={Clock}
                  label="20 Min"
                  color="text-white"
                  bg="border-fuchsia-500 bg-gradient-to-b from-fuchsia-300 via-fuchsia-500 to-purple-600 shadow-[0_8px_0_rgba(120,60,160,0.35),0_16px_28px_rgba(200,120,255,0.25)]"
                />
              </div>
            </section>

            <section className="w-full">
              <div className="mx-auto w-full max-w-md rounded-3xl p-6 sm:border-2 sm:border-indigo-50 sm:bg-white/90 sm:shadow-lg sm:shadow-indigo-100/50 sm:backdrop-blur lg:mx-0">
                <div className="space-y-4">
                  <Button
                    onClick={() => {
                      setCreateError("");
                      setIsCreateDrawerOpen(true);
                    }}
                    variant="gummyOrange"
                    className="h-[72px] w-full text-3xl"
                  >
                    <span className="flex items-center gap-3">
                      <Gamepad2 className="h-8 w-8 stroke-[3.5]" />
                      New Game
                    </span>
                  </Button>

                  <Button
                    onClick={() => setIsJoinDrawerOpen(true)}
                    variant="gummyBlue"
                    className="h-[72px] w-full text-3xl"
                  >
                    <span className="flex items-center gap-3">
                      <LogIn className="h-8 w-8 stroke-[3.5]" />
                      Join Game
                    </span>
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Drawer
        open={isCreateDrawerOpen}
        onOpenChange={(open) => {
          setIsCreateDrawerOpen(open);
          if (!open) {
            setHostName("");
            setCreateError("");
          }
        }}
      >
        <DrawerContent className="rounded-t-[2rem] border-2 border-rose-200 bg-gradient-to-br from-rose-100 via-amber-50 to-white px-6 pb-8 pt-6 shadow-[0_-20px_60px_rgba(255,117,140,0.35)] [&>div:first-child]:hidden">
          <div className="mx-auto w-full max-w-md space-y-6">
            <DrawerTitle className="sr-only">Create a new game</DrawerTitle>
            <div className="mx-auto h-2 w-16 rounded-full bg-rose-300/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]" />
            <div className="space-y-3">
              <Label
                htmlFor="host-name"
                className="text-xs font-bold uppercase tracking-widest text-rose-500/80"
              >
                Your Nickname
              </Label>
              <Input
                id="host-name"
                placeholder="e.g. CardShark"
                value={hostName}
                onChange={(event) => setHostName(event.target.value)}
                className="h-14 rounded-xl border-2 border-rose-200 bg-white/90 text-lg font-bold text-slate-800 shadow-[0_10px_25px_rgba(255,138,170,0.25)] placeholder:font-medium placeholder:text-rose-200 focus:border-rose-400 focus:ring-rose-200"
              />
            </div>

            {createError && (
              <div className="animate-pulse rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                {createError}
              </div>
            )}

            <DrawerFooter className="px-0">
              <Button
                onClick={handleCreateLobby}
                disabled={!hostName.trim() || isCreating}
                variant="gummyOrange"
                className="h-12 w-full text-base"
              >
                {isCreating ? "Creating..." : "Start Lobby"}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={isJoinDrawerOpen}
        onOpenChange={(open) => {
          setIsJoinDrawerOpen(open);
          if (!open) setLobbyCode("");
        }}
      >
      <DrawerContent className="rounded-t-[2rem] border-2 border-sky-200 bg-gradient-to-br from-sky-100 via-blue-50 to-white px-6 pb-8 pt-6 shadow-[0_-20px_60px_rgba(96,165,250,0.35)] [&>div:first-child]:hidden">
          <div className="mx-auto w-full max-w-md space-y-4">
            <DrawerTitle className="sr-only">Join a game</DrawerTitle>
            <div className="mx-auto h-2 w-16 rounded-full bg-sky-300/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]" />
            <div className="w-full">
              <InputOTP
                maxLength={6}
                value={lobbyCode}
                onChange={(value) => setLobbyCode(value.toUpperCase())}
                containerClassName="w-full justify-between"
              >
                <InputOTPGroup className="w-full justify-between gap-2">
                <InputOTPSlot
                  index={0}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSlot
                  index={1}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSeparator className="text-sky-500" />
                <InputOTPSlot
                  index={2}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSlot
                  index={3}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSeparator className="text-sky-500" />
                <InputOTPSlot
                  index={4}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSlot
                  index={5}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
              </InputOTPGroup>
            </InputOTP>
            </div>
            <DrawerFooter className="px-0">
              <Button
                onClick={() =>
                  lobbyCode.trim() && router.push(`/lobby/${lobbyCode.trim()}`)
                }
                variant="gummyBlue"
                className="h-12 w-full text-base"
                disabled={lobbyCode.trim().length !== 6}
              >
                {lobbyCode.trim().length === 6
                  ? "Join Game"
                  : "Enter Lobby Code..."}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </SessionGate>
  );
}

function InfoPill({ icon: Icon, label, color, bg }: InfoPillProps) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-full border-2 px-4 py-2",
        bg,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[12%] h-[35%] w-[calc(100%-1.25rem)] -translate-x-1/2 rounded-full bg-white/20 blur-[1px]"
      />
      <Icon className={cn("h-4 w-4", color)} />
      <span className={cn("text-xs font-bold uppercase tracking-wider", color)}>
        {label}
      </span>
    </div>
  );
}
