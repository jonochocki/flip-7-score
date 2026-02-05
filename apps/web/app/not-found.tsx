"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { AppHeader } from "@/components/app-header";

export default function NotFound() {
  return (
    <main className="relative min-h-svh overflow-hidden px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,86,120,0.45),transparent_65%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(70,210,255,0.55),transparent_65%)] blur-3xl" />

      <div className="relative mx-auto flex min-h-svh w-full max-w-5xl flex-col items-center gap-10 pt-4 sm:pt-6">
        <div className="fixed top-0 left-0 right-0 z-40 border-b border-white/20 bg-transparent px-6 py-4 backdrop-blur-lg sm:px-8 md:py-3">
          <div className="mx-auto w-full max-w-5xl">
            <AppHeader showButtons={false} />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-10 pt-16 sm:pt-20">
        <div className="flex flex-col items-center gap-6 text-center">
          <Image
            src="/assets/img/404-error.png"
            alt="Card torn in half"
            width={560}
            height={420}
            className="h-auto w-[260px] sm:w-[360px]"
            priority
          />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#ff4f70] dark:text-[#ff87a0]">
              Shuffle the cards again...
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Page Not Found
            </h1>
            <p className="max-w-lg text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              That card doesn&apos;t exist anymore. Head back to the lobby and
              jump into a new game.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild variant="gummyOrange" className="h-12 px-6 text-sm">
            <Link href="/">Back Home</Link>
          </Button>
        </div>
        </div>
      </div>
    </main>
  );
}
