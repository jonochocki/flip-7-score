"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

type UseAnonSessionResult = {
  session: Session | null;
  error: string | null;
  loading: boolean;
  supabase: SupabaseClient;
};

export const useAnonSession = (): UseAnonSessionResult => {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const ensureSession = async () => {
      setLoading(true);
      setError(null);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!isMounted) return;

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (sessionData.session) {
        setSession(sessionData.session);
        setLoading(false);
        return;
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInAnonymously();

      if (!isMounted) return;

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      setSession(signInData.session ?? null);
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
      },
    );

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  return { session, error, loading, supabase };
};
