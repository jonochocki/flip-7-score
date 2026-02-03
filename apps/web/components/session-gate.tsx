"use client";

import type { ReactNode } from "react";
import { SessionErrorState } from "@/components/session-error";

type SessionGateProps = {
  loading: boolean;
  error?: string | null;
  children: ReactNode;
  loadingFallback?: ReactNode;
};

const DefaultLoadingState = () => (
  <main className="min-h-svh bg-[#f7f2e7] px-6 py-10 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-200">
    Setting up your session...
  </main>
);

export function SessionGate({
  loading,
  error,
  children,
  loadingFallback,
}: SessionGateProps) {
  if (error) {
    return <SessionErrorState message={error} />;
  }

  if (loading) {
    return loadingFallback ?? <DefaultLoadingState />;
  }

  return <>{children}</>;
}
