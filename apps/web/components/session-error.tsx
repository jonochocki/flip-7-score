"use client";

import { useEffect } from "react";

type SessionErrorProps = {
  message?: string | null;
};

export function SessionErrorState({ message }: SessionErrorProps) {
  useEffect(() => {
    if (message) {
      console.error("[auth] session error", message);
    }
  }, [message]);

  const detail =
    process.env.NODE_ENV === "development" ? message : "";

  return (
    <main className="min-h-svh bg-[#f7f2e7] px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-3xl border-2 border-[#ff4f70] bg-white/80 p-6 text-sm shadow-[0_18px_40px_rgba(255,79,112,0.2)] dark:border-[#ff87a0] dark:bg-slate-950/70">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ff4f70] dark:text-[#ff87a0]">
          Session Issue
        </p>
        <h1 className="text-2xl font-semibold">We couldn't start your session.</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Refresh the page or try again in a moment. If the problem continues,
          check your network connection.
        </p>
        {detail ? (
          <div className="rounded-xl border border-[#ff4f70]/40 bg-[#ff4f70]/10 px-3 py-2 text-xs text-[#a51f3b] dark:border-[#ff87a0]/40 dark:bg-[#ff87a0]/10 dark:text-[#ffd1db]">
            {detail}
          </div>
        ) : null}
      </div>
    </main>
  );
}
