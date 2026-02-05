"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { cn } from "@workspace/ui/lib/utils";

type CardLoaderProps = {
  className?: string;
  size?: number;
};

export function CardLoader({ className, size = 220 }: CardLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <DotLottieReact
        src="/assets/img/7-score-card-loader.lottie"
        loop
        autoplay
        style={{ width: size, height: size }}
      />
    </div>
  );
}
