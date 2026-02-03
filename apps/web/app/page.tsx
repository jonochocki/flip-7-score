"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { createClient } from "@/utils/supabase/client";
import { AppHeader } from "@/components/app-header";

type Mode = "idle" | "join";
type StoredHostLobby = {
  gameId: string;
  code: string;
  playerId: string;
};

export default function Page() {
  const [mode, setMode] = useState<Mode>("idle");
  const [lobbyCode, setLobbyCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hostName, setHostName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateLobby = async () => {
    if (!hostName.trim() || isCreating) return;
    setCreateError("");
    setIsCreating(true);

    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        setCreateError(authError.message);
        setIsCreating(false);
        return;
      }
    }

    const stored =
      typeof window !== "undefined"
        ? (localStorage.getItem("flip7_host_lobby") ?? "")
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
      localStorage.removeItem("flip7_host_lobby");
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
    localStorage.setItem(
      "flip7_host_lobby",
      JSON.stringify({
        gameId: created.game_id,
        code: created.code,
        playerId: created.player_id,
      }),
    );
    localStorage.setItem(
      `flip7_player_${created.code}`,
      JSON.stringify({ gameId: created.game_id, playerId: created.player_id }),
    );
    router.push(`/lobby/${created.code}`);
  };

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#f7f2e7] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,86,120,0.45),transparent_65%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(70,210,255,0.55),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute left-10 top-20 hidden h-32 w-32 rotate-6 rounded-3xl border-[3px] border-[#1f2b7a]/60 bg-white/70 shadow-[0_20px_45px_rgba(31,43,122,0.25)] lg:block dark:border-[#7ce7ff]/70 dark:bg-slate-900/60" />

      <div className="relative mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:py-14">
        <AppHeader />
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#ff4f70] dark:text-[#ff87a0]">
                Press Your Luck
              </p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                7 Score
              </h1>
              <p className="max-w-xl text-base text-slate-700 dark:text-slate-200 sm:text-lg">
                Start a new lobby or jump into a friend&apos;s game with a quick
                code scan.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] dark:text-[#7ce7ff] sm:text-sm">
              <span className="rounded-full border-2 border-[#1f2b7a] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(31,43,122,0.2)] sm:px-4 dark:border-[#7ce7ff] dark:bg-slate-900/70">
                Race To 200
              </span>
              <span className="rounded-full border-2 border-[#1f2b7a] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(31,43,122,0.2)] sm:px-4 dark:border-[#7ce7ff] dark:bg-slate-900/70">
                3+ Players
              </span>
              <span className="rounded-full border-2 border-[#1f2b7a] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(31,43,122,0.2)] sm:px-4 dark:border-[#7ce7ff] dark:bg-slate-900/70">
                20 Min
              </span>
            </div>
          </div>

          <section className="relative rounded-[28px] border-[3px] border-[#1f2b7a] bg-white/90 p-5 shadow-[0_25px_60px_rgba(31,43,122,0.28)] backdrop-blur sm:p-6 dark:border-[#7ce7ff] dark:bg-slate-900/80">
            <div className="absolute -top-5 left-6 rounded-full border-[3px] border-[#1f2b7a] bg-[#ffd04a] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_12px_24px_rgba(31,43,122,0.25)] dark:border-[#7ce7ff] dark:bg-[#ffb64a] dark:text-slate-900">
              Game Lobby
            </div>

            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={() => {
                    setCreateError("");
                    setIsDialogOpen(true);
                  }}
                  className="h-12 rounded-full border-2 border-[#1f2b7a] bg-gradient-to-r from-[#ff4f70] via-[#ffd04a] to-[#46d2ff] text-base font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_14px_25px_rgba(31,43,122,0.25)] hover:opacity-90 dark:border-[#7ce7ff] dark:text-slate-900"
                >
                  New Game
                </Button>
                <Button
                  onClick={() => setMode("join")}
                  className="h-12 rounded-full border-2 border-[#1f2b7a] bg-white text-base font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_12px_20px_rgba(31,43,122,0.2)] hover:bg-white/80 dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-[#7ce7ff]"
                >
                  Join Game
                </Button>
              </div>

              {mode === "join" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="lobby-code"
                      className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1f2b7a] dark:text-[#7ce7ff] sm:text-sm"
                    >
                      Lobby Code
                    </Label>
                    <Input
                      id="lobby-code"
                      placeholder="Enter 6-character code"
                      autoCapitalize="characters"
                      value={lobbyCode}
                      onChange={(event) =>
                        setLobbyCode(event.target.value.toUpperCase())
                      }
                      className="h-12 rounded-full border-2 border-[#1f2b7a] bg-white/90 text-base text-slate-900 shadow-[0_10px_20px_rgba(31,43,122,0.18)] placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#ff4f70] dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-400"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!lobbyCode.trim()) return;
                      router.push(`/lobby/${lobbyCode.trim()}`);
                    }}
                    className="h-12 w-full rounded-full border-2 border-[#1f2b7a] bg-gradient-to-r from-[#ff4f70] via-[#ffd04a] to-[#46d2ff] text-base font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_14px_25px_rgba(31,43,122,0.25)] hover:opacity-90 dark:border-[#7ce7ff] dark:text-slate-900"
                  >
                    Join Lobby
                  </Button>
                </div>
                )}
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setHostName("");
            setCreateError("");
          }
        }}
      >
        <DialogContent className="rounded-3xl border-2 border-[#1f2b7a] bg-white/95 shadow-[0_25px_60px_rgba(31,43,122,0.35)] dark:border-[#7ce7ff] dark:bg-slate-950/90">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-semibold text-[#1f2b7a] dark:text-[#7ce7ff]">
              New Game
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-300">
              Tell us who&apos;s hosting so the lobby is ready to share.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label
              htmlFor="host-name"
              className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1f2b7a] dark:text-[#7ce7ff] sm:text-sm"
            >
              Who is the host?
            </Label>
            <Input
              id="host-name"
              placeholder="Enter your name"
              value={hostName}
              onChange={(event) => setHostName(event.target.value)}
              className="h-12 rounded-full border-2 border-[#1f2b7a] bg-white/90 text-base text-slate-900 shadow-[0_10px_20px_rgba(31,43,122,0.18)] placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#ff4f70] dark:border-[#7ce7ff] dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>

          {createError && (
            <div className="rounded-2xl border-2 border-[#ff4f70] bg-[#ff4f70]/10 p-3 text-sm text-[#a51f3b] dark:border-[#ff87a0] dark:bg-[#ff87a0]/10 dark:text-[#ffd1db]">
              {createError}
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={handleCreateLobby}
              disabled={!hostName.trim() || isCreating}
              className="h-11 rounded-full border-2 border-[#1f2b7a] bg-gradient-to-r from-[#ff4f70] via-[#ffd04a] to-[#46d2ff] text-sm font-semibold uppercase tracking-[0.2em] text-[#1f2b7a] shadow-[0_14px_25px_rgba(31,43,122,0.25)] hover:opacity-90 disabled:opacity-70 dark:border-[#7ce7ff] dark:text-slate-900"
            >
              {isCreating ? "Starting..." : "Start Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
