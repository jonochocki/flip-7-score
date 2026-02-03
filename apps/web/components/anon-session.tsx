"use client";

import { useMemo } from "react";
import { useAnonSession } from "@/hooks/use-anon-session";

export function AnonSession() {
  const {
    session,
    error,
    loading,
    status,
    attempts,
    maxAttempts,
    sessionOrigin,
  } = useAnonSession();
  const message = useMemo(() => {
    if (status === "timeout") return "Session setup timed out. Try again.";
    if (loading) return "Signing in...";
    if (error) return error;
    if (session && sessionOrigin === "existing")
      return "Anonymous session active (existing).";
    if (session && sessionOrigin === "new")
      return "Anonymous session created.";
    if (session) return "Anonymous session active.";
    return "Anonymous session unavailable.";
  }, [error, loading, session, sessionOrigin, status]);

  return (
    <div className="rounded border px-4 py-3 text-sm">
      <p className="font-medium">Session</p>
      <p className="text-muted-foreground">
        {message}
      </p>
      {status === "retrying" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Retry {attempts} of {maxAttempts}...
        </p>
      ) : null}
    </div>
  );
}
