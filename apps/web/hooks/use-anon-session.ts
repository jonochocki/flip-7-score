"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 2500;
const TIMEOUT_MS = 8000;

type SessionOrigin = "existing" | "new" | null;
type SessionStatus =
  | "idle"
  | "checking"
  | "signing-in"
  | "retrying"
  | "ready"
  | "timeout"
  | "error";

type UseAnonSessionResult = {
  session: Session | null;
  error: string | null;
  loading: boolean;
  status: SessionStatus;
  attempts: number;
  maxAttempts: number;
  sessionOrigin: SessionOrigin;
  supabase: SupabaseClient;
};

export const useAnonSession = (): UseAnonSessionResult => {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [attempts, setAttempts] = useState(0);
  const [sessionOrigin, setSessionOrigin] = useState<SessionOrigin>(null);

  useEffect(() => {
    let isMounted = true;

    const ensureSession = async () => {
      const startedAt = Date.now();
      setLoading(true);
      setError(null);
      setStatus("checking");
      setAttempts(0);
      setSessionOrigin(null);

      const hasTimedOut = () => Date.now() - startedAt > TIMEOUT_MS;
      const sleep = (ms: number) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, ms);
        });

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!isMounted) return;

      if (sessionError) {
        setError(sessionError.message);
        setStatus("error");
        setLoading(false);
        return;
      }

      if (sessionData.session) {
        setSession(sessionData.session);
        setSessionOrigin("existing");
        setStatus("ready");
        setLoading(false);
        return;
      }

      let lastError: string | null = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        if (hasTimedOut()) {
          setError("Session setup timed out. Please try again.");
          setStatus("timeout");
          setLoading(false);
          return;
        }

        setAttempts(attempt);
        setStatus(attempt === 1 ? "signing-in" : "retrying");

        const { data: signInData, error: signInError } =
          await supabase.auth.signInAnonymously();

        if (!isMounted) return;

        if (!signInError) {
          setSession(signInData.session ?? null);
          setSessionOrigin("new");
          setStatus("ready");
          setLoading(false);
          return;
        }

        lastError = signInError.message;

        if (attempt < MAX_ATTEMPTS) {
          const backoff =
            Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS) +
            Math.floor(Math.random() * 250);
          await sleep(backoff);
        }
      }

      setError(lastError ?? "Unable to start session.");
      setStatus("error");
      setLoading(false);
    };

    ensureSession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    const { data } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        if (nextSession && !sessionOrigin) {
          setSessionOrigin("existing");
        }
      },
    );

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  return {
    session,
    error,
    loading,
    status,
    attempts,
    maxAttempts: MAX_ATTEMPTS,
    sessionOrigin,
    supabase,
  };
};
