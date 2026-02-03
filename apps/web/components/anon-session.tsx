"use client";

import { useMemo } from "react";
import { useAnonSession } from "@/hooks/use-anon-session";

export function AnonSession() {
  const { session, error, loading } = useAnonSession();
  const message = useMemo(() => {
    if (loading) return "Signing in...";
    if (error) return error;
    if (session) return "Anonymous session active.";
    return "Anonymous session unavailable.";
  }, [error, loading, session]);

  return (
    <div className="rounded border px-4 py-3 text-sm">
      <p className="font-medium">Session</p>
      <p className="text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
