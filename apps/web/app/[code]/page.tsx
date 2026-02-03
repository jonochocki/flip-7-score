"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CodeRedirectPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    const rawCode = params?.code;
    const code = typeof rawCode === "string" ? rawCode.toUpperCase() : "";
    if (code) {
      router.replace(`/lobby/${code}`);
    }
  }, [params, router]);

  return null;
}
