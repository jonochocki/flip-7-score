import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full border-2 border-transparent text-sm font-black uppercase tracking-wide transition-transform disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive before:pointer-events-none before:absolute before:left-1/2 before:top-[12%] before:h-[35%] before:w-[calc(100%-2rem)] before:-translate-x-1/2 before:rounded-full before:bg-white/20 before:blur-[1px] before:content-[''] shadow-[0_8px_0_rgba(0,0,0,0.14),0_14px_28px_rgba(0,0,0,0.12)] active:translate-y-[5px] active:shadow-[0_3px_0_rgba(0,0,0,0.14),0_8px_16px_rgba(0,0,0,0.12)]",
  {
    variants: {
      variant: {
        default:
          "border-primary/80 bg-gradient-to-b from-primary/70 via-primary to-primary text-primary-foreground hover:brightness-110",
        destructive:
          "border-destructive/80 bg-gradient-to-b from-destructive/70 via-destructive to-destructive text-white hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background text-foreground before:hidden shadow-[0_6px_0_rgba(0,0,0,0.12)] active:translate-y-[2px] active:shadow-[0_3px_0_rgba(0,0,0,0.12)] hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "border-secondary/80 bg-gradient-to-b from-secondary/70 via-secondary to-secondary text-secondary-foreground hover:brightness-110",
        ghost:
          "border-transparent bg-transparent text-foreground shadow-none before:hidden active:translate-y-0 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link:
          "border-transparent bg-transparent text-primary shadow-none before:hidden active:translate-y-0 underline-offset-4 hover:underline",
        gummyOrange:
          "border-orange-500 bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 text-white hover:brightness-110",
        gummyBlue:
          "border-sky-600 bg-gradient-to-b from-sky-300 via-sky-500 to-blue-600 text-white hover:brightness-110",
        gummyRed:
          "border-rose-500 bg-gradient-to-b from-rose-300 via-rose-500 to-rose-600 text-white hover:brightness-110",
        gummyRainbow:
          "border-pink-500 bg-gradient-to-r from-pink-400 via-amber-300 to-sky-400 text-white hover:brightness-110",
        gummyBlack:
          "border-slate-900 bg-gradient-to-b from-slate-700 via-slate-900 to-black text-white hover:brightness-110",
        gummyGray:
          "border-slate-400 bg-gradient-to-b from-slate-200 via-slate-400 to-slate-500 text-white hover:brightness-110",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  type,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  const buttonType = asChild ? type : type ?? "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      type={buttonType}
      {...props}
    />
  )
}

export { Button, buttonVariants }
