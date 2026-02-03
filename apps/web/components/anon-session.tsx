"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Status = "idle" | "signing-in" | "ready" | "error";

export function AnonSession() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();

    const ensureSession = async () => {
      setStatus("signing-in");
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        setStatus("ready");
        setMessage("Anonymous session active.");
        return;
      }

      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("ready");
      setMessage("Anonymous session created.");
    };

    ensureSession();
  }, []);

  return (
    <div className="rounded border px-4 py-3 text-sm">
      <p className="font-medium">Session</p>
      <p className="text-muted-foreground">
        {status === "signing-in" ? "Signing in..." : message}
      </p>
    </div>
  );
}
