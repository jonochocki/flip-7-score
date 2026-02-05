"use client";

import { type ElementType, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Clock, Gamepad2, Github, LogIn, Trophy, Users } from "lucide-react";
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
import { AppHeader } from "@/components/app-header";
import { CardLoader } from "@/components/card-loader";
import { SessionGate } from "@/components/session-gate";
import { useAnonSession } from "@/hooks/use-anon-session";
import { cn } from "@workspace/ui/lib/utils";
import {
  getAvatarClass,
  getAvatarLabel,
} from "@/components/lobby-player-bubbles";

type StoredHostLobby = {
  gameId: string;
  code: string;
  playerId: string;
};

type StoredProfile = {
  name: string;
  avatar: string | null;
  color: string | null;
};

type InfoPillProps = {
  icon: ElementType;
  label: string;
  color: string;
  bg: string;
  className?: string;
};

const HomeSessionLoading = () => (
  <main className="relative min-h-svh overflow-hidden text-slate-900 dark:text-slate-100">
    <div className="relative mx-auto flex min-h-svh w-full max-w-5xl flex-col items-center justify-center gap-6 px-5 pb-24 pt-6 sm:px-10 sm:pb-28 sm:pt-10 lg:px-16">
      <CardLoader />
    </div>
  </main>
);

export default function Page() {
  const [isJoinDrawerOpen, setIsJoinDrawerOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profileDrawerMode, setProfileDrawerMode] = useState<
    "create" | "update"
  >("create");
  const [lobbyCode, setLobbyCode] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileColor, setProfileColor] = useState<string | null>(null);
  const router = useRouter();

  const {
    error: sessionError,
    loading: sessionLoading,
    supabase: supabaseClient,
  } = useAnonSession();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored =
      sessionStorage.getItem("7score_profile") ??
      localStorage.getItem("7score_profile") ??
      sessionStorage.getItem("flip7_profile") ??
      localStorage.getItem("flip7_profile");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as StoredProfile;
      if (parsed?.name) {
        setProfileName(parsed.name);
        setProfileAvatar(parsed.avatar ?? null);
        setProfileColor(parsed.color ?? null);
        const nextValue = JSON.stringify({
          name: parsed.name,
          avatar: parsed.avatar ?? null,
          color: parsed.color ?? null,
        } satisfies StoredProfile);
        sessionStorage.setItem("7score_profile", nextValue);
        localStorage.setItem("7score_profile", nextValue);
      }
    } catch {
      try {
        sessionStorage.removeItem("7score_profile");
        localStorage.removeItem("7score_profile");
        sessionStorage.removeItem("flip7_profile");
        localStorage.removeItem("flip7_profile");
      } catch {
        // Ignore storage failures.
      }
    }
  }, []);

  const createLobby = async (
    nextName: string,
    nextAvatar: string | null,
    nextColor: string | null,
  ) => {
    if (!nextName.trim() || isCreating) return;
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
              .update({
                name: nextName.trim(),
                avatar: nextAvatar,
                color: nextColor,
              })
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
      p_name: nextName.trim(),
      p_avatar: nextAvatar,
      p_color: nextColor,
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
      const profileValue = JSON.stringify({
        name: nextName.trim(),
        avatar: nextAvatar ?? null,
        color: nextColor ?? null,
      } satisfies StoredProfile);
      sessionStorage.setItem("7score_profile", profileValue);
      localStorage.setItem("7score_profile", profileValue);
    } catch {
      // Ignore storage failures.
    }
    router.push(`/lobby/${created.code}`);
  };

  const handleCreateLobby = async () => {
    await createLobby(profileName.trim(), profileAvatar, profileColor);
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    setCreateError("");
    try {
      const profileValue = JSON.stringify({
        name: profileName.trim(),
        avatar: profileAvatar ?? null,
        color: profileColor ?? null,
      } satisfies StoredProfile);
      sessionStorage.setItem("7score_profile", profileValue);
      localStorage.setItem("7score_profile", profileValue);
    } catch {
      // Ignore storage failures.
    }
    setIsProfileDrawerOpen(false);
  };

  const handleNotThisUser = () => {
    try {
      sessionStorage.removeItem("7score_profile");
      localStorage.removeItem("7score_profile");
    } catch {
      // Ignore storage failures.
    }
    setProfileName("");
    setProfileAvatar(null);
    setProfileColor(null);
    setIsProfileMenuOpen(false);
    setProfileDrawerMode("update");
    setIsProfileDrawerOpen(true);
  };

  return (
    <SessionGate
      loading={sessionLoading}
      error={sessionError}
      loadingFallback={<HomeSessionLoading />}
    >
      <main className="relative min-h-svh w-full font-sans text-slate-900 dark:text-slate-100">
        <div className="relative z-10 flex min-h-svh w-full flex-col px-5 pb-6 pt-6 sm:px-10 sm:pb-10 sm:pt-10 lg:px-16">
          <div className="sticky top-0 z-30 -mx-5 pb-4 pt-0 sm:-mx-10 lg:-mx-16">
            <div className="px-5 sm:px-10 lg:px-16">
              <AppHeader
                showButtons={false}
                onRightClick={() => {
                  if (!profileName) return;
                  setIsProfileMenuOpen(true);
                }}
                rightSlot={
                  profileName ? (
                    <button
                      type="button"
                      onClick={() => setIsProfileMenuOpen(true)}
                      className="flex items-center gap-2 rounded-full border-2 border-[#1f2b7a] bg-white/90 pl-3 pr-1 py-1 shadow-[0_12px_24px_rgba(31,43,122,0.2)] backdrop-blur transition hover:brightness-105 dark:border-[#7ce7ff]/50 dark:bg-slate-950/70 sm:gap-3"
                      aria-label="Profile menu"
                    >
                      <div className="max-w-[120px] truncate text-xs font-semibold text-[#1f2b7a] dark:text-[#7ce7ff] sm:max-w-none sm:text-sm">
                        {profileName.slice(0, 15)}
                      </div>
                      <div
                        className={`flex items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg ${getAvatarClass(
                          profileName,
                          profileColor,
                        )}`}
                        style={{ width: 36, height: 36 }}
                      >
                        {getAvatarLabel(profileName, profileAvatar)}
                      </div>
                    </button>
                  ) : (
                    <div className="h-10 w-10" aria-hidden />
                  )
                }
              />
            </div>
          </div>

          <div className="flex flex-1 items-center">
            <div className="w-full">
              <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <section className="space-y-6 text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <Image
                  src="/assets/img/card-fan.png"
                  alt=""
                  width={520}
                  height={320}
                  className="h-40 w-auto object-contain sm:h-48"
                  priority
                />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                  Scorekeeper for your game night
                </h1>
                <p className="mx-auto max-w-xl text-base font-medium text-slate-600 dark:text-slate-300 lg:mx-0 lg:text-lg">
                  Fast rounds, clean totals, and zero fuss at the table.
                </p>
              </div>

            </section>

            <section className="w-full">
              <div className="space-y-4">
                    <Button
                      onClick={() => {
                        setCreateError("");
                        if (profileName) {
                          createLobby(
                            profileName,
                            profileAvatar,
                            profileColor,
                          );
                          return;
                        }
                        setProfileDrawerMode("create");
                        setIsProfileDrawerOpen(true);
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

              <div className="mt-6 grid w-full grid-cols-3 gap-2">
                <InfoPill
                  icon={Trophy}
                  label="Race to 200"
                  color="text-amber-600 dark:text-amber-300"
                  bg="border-amber-500 bg-white shadow-[0_8px_0_rgba(180,95,20,0.25),0_16px_28px_rgba(255,166,92,0.15)] dark:border-amber-400 dark:bg-slate-900 dark:shadow-[0_8px_0_rgba(251,191,36,0.2),0_16px_28px_rgba(15,23,42,0.5)]"
                  className="min-w-0 justify-center px-2 py-1 text-[10px] sm:text-xs"
                />
                <InfoPill
                  icon={Users}
                  label="3+ Players"
                  color="text-sky-600 dark:text-sky-300"
                  bg="border-sky-600 bg-white shadow-[0_8px_0_rgba(30,110,170,0.25),0_16px_28px_rgba(96,165,250,0.15)] dark:border-sky-400 dark:bg-slate-900 dark:shadow-[0_8px_0_rgba(56,189,248,0.2),0_16px_28px_rgba(15,23,42,0.5)]"
                  className="min-w-0 justify-center px-2 py-1 text-[10px] sm:text-xs"
                />
                <InfoPill
                  icon={Clock}
                  label="20 Min"
                  color="text-fuchsia-600 dark:text-fuchsia-300"
                  bg="border-fuchsia-500 bg-white shadow-[0_8px_0_rgba(120,60,160,0.25),0_16px_28px_rgba(200,120,255,0.15)] dark:border-fuchsia-400 dark:bg-slate-900 dark:shadow-[0_8px_0_rgba(217,70,239,0.2),0_16px_28px_rgba(15,23,42,0.5)]"
                  className="min-w-0 justify-center px-2 py-1 text-[10px] sm:text-xs"
                />
              </div>
            </section>
              </div>
            </div>
          </div>

          <footer className="mt-8 flex w-full justify-center text-sm text-slate-500 dark:text-slate-400 lg:justify-start">
            <a
              href="https://github.com/jonochocki/flip-7-score"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-medium transition hover:text-slate-700 dark:hover:text-slate-200"
            >
              Made by Jon Ochocki | <Github className="h-4 w-4" />
            </a>
          </footer>
        </div>
      </main>

      <Drawer open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
        <DrawerContent className="rounded-t-[32px] border-0 bg-white/95 p-6 pb-8 pt-12 shadow-[0_20px_50px_rgba(255,107,153,0.2)] sm:p-8 sm:pt-14 [&>div:first-child]:hidden before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[10px] before:rounded-t-[32px] before:bg-[linear-gradient(90deg,#ff6b99,#ffd966,#66e0ff,#a855f7,#ff6b99)]">
          <div className="mx-auto flex w-full max-w-md flex-col gap-6 text-center">
            <DrawerTitle className="sr-only">Update profile</DrawerTitle>
            <div className="relative -mt-12 flex justify-center sm:-mt-16">
              <div
                className={`relative flex h-20 w-20 items-center justify-center rounded-full text-3xl font-semibold text-white shadow-[0_18px_40px_rgba(255,107,153,0.25)] ring-4 ring-white/80 ${getAvatarClass(
                  profileName || "you",
                  profileColor,
                )}`}
              >
                <span className="pointer-events-none absolute left-[18%] top-[18%] h-[38%] w-[38%] rounded-full bg-white/20 blur-[1px]" />
                <span className={profileAvatar ? "text-3xl leading-none" : "text-2xl"}>
                  {getAvatarLabel(profileName, profileAvatar)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setProfileDrawerMode("update");
                  setIsProfileMenuOpen(false);
                  setIsProfileDrawerOpen(true);
                }}
                variant="gummyBlue"
                className="h-12 w-full text-base"
              >
                Update Profile
              </Button>
              <Button
                onClick={handleNotThisUser}
                variant="gummyOrange"
                className="h-12 w-full text-base"
              >
                Not {profileName}?
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={isProfileDrawerOpen}
        onOpenChange={(open) => {
          setIsProfileDrawerOpen(open);
          if (!open) {
            setCreateError("");
          }
        }}
      >
        <DrawerContent className="rounded-t-[32px] border-0 bg-white/95 p-6 pb-8 pt-12 shadow-[0_20px_50px_rgba(255,107,153,0.2)] sm:p-8 sm:pt-14 [&>div:first-child]:hidden before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[10px] before:rounded-t-[32px] before:bg-[linear-gradient(90deg,#ff6b99,#ffd966,#66e0ff,#a855f7,#ff6b99)]">
          <div className="mx-auto flex w-full max-w-md flex-col gap-6">
            <DrawerTitle className="sr-only">Profile setup</DrawerTitle>
            <div className="relative -mt-12 flex justify-center sm:-mt-16">
              <div
                className={`relative flex h-24 w-24 items-center justify-center rounded-full text-4xl font-semibold text-white shadow-[0_18px_40px_rgba(255,107,153,0.25)] ring-4 ring-white/80 ${getAvatarClass(
                  profileName || "you",
                  profileColor,
                )}`}
              >
                <span className="pointer-events-none absolute left-[18%] top-[18%] h-[38%] w-[38%] rounded-full bg-white/20 blur-[1px]" />
                <span
                  className={
                    profileAvatar ? "text-4xl leading-none" : "text-2xl"
                  }
                >
                  {getAvatarLabel(profileName, profileAvatar)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <Label
                htmlFor="profile-name"
                className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff6b99] sm:text-sm"
              >
                Your Nickname
              </Label>
              <Input
                id="profile-name"
                placeholder="e.g. CardShark"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
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
                    onClick={() => setProfileAvatar(avatar)}
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
                    onClick={() => setProfileColor(option.key)}
                    className={`h-10 w-10 rounded-full ring-4 ring-white/70 ${
                      profileColor === option.key ? "border-2 border-black" : ""
                    } ${getAvatarClass(option.key, option.key)}`}
                    aria-label={option.label}
                  />
                ))}
              </div>
            </div>

            {createError && (
              <div className="animate-pulse rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                {createError}
              </div>
            )}

            <DrawerFooter className="px-0">
              <Button
                onClick={
                  profileDrawerMode === "create"
                    ? handleCreateLobby
                    : handleSaveProfile
                }
                disabled={!profileName.trim() || isCreating}
                variant="gummyOrange"
                className="h-12 w-full text-base"
              >
                {isCreating
                  ? "Creating..."
                  : profileDrawerMode === "create"
                    ? "Start Lobby"
                    : "Save Profile"}
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
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white font-atkinson text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSlot
                  index={1}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white font-atkinson text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSeparator className="text-sky-500" />
                <InputOTPSlot
                  index={2}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white font-atkinson text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSlot
                  index={3}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white font-atkinson text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSeparator className="text-sky-500" />
                <InputOTPSlot
                  index={4}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white font-atkinson text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
                />
                <InputOTPSlot
                  index={5}
                  className="h-12 w-12 rounded-xl border-2 border-sky-200 bg-white font-atkinson text-lg font-black uppercase text-slate-900 shadow-[0_8px_18px_rgba(96,165,250,0.2)] data-[active=true]:bg-white"
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

function InfoPill({ icon: Icon, label, color, bg, className }: InfoPillProps) {
  return (
    <div
      className={cn(
                "relative flex items-center gap-2 rounded-full border-2 px-4 py-2 whitespace-nowrap",
                bg,
                className,
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
