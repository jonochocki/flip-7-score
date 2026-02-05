import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "@workspace/ui/components/sonner"

export const metadata = {
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      { rel: "mask-icon", url: "/android-chrome-192x192.png" },
      { rel: "mask-icon", url: "/android-chrome-512x512.png" },
    ],
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf2f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster
          position="top-center"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "group pointer-events-auto relative flex w-full items-start gap-3 rounded-[28px] border-[3px] px-4 py-3 text-[#1f2b7a] shadow-[0_10px_0_rgba(31,43,122,0.18),0_22px_40px_rgba(31,43,122,0.28)] before:pointer-events-none before:absolute before:left-6 before:right-6 before:top-1.5 before:h-1.5 before:rounded-full before:bg-white/70 before:opacity-90 dark:text-[#0b1020] dark:shadow-[0_10px_0_rgba(12,18,34,0.45),0_22px_40px_rgba(12,18,34,0.6)]",
              title:
                "relative z-10 text-[11px] font-black uppercase tracking-[0.35em] text-current",
              description:
                "relative z-10 mt-1 text-sm font-semibold text-current",
              icon:
                "relative z-10 mt-0.5 text-current",
              actionButton:
                "relative z-10 rounded-full border-2 border-[#1f2b7a] bg-gradient-to-b from-sky-300 via-sky-500 to-blue-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[0_6px_16px_rgba(31,43,122,0.2)]",
              cancelButton:
                "relative z-10 rounded-full border-2 border-slate-300 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.12)]",
              success:
                "border-emerald-400 bg-gradient-to-r from-emerald-300 via-emerald-200 to-sky-200",
              error:
                "border-rose-400 bg-gradient-to-r from-rose-300 via-rose-200 to-pink-200",
              warning:
                "border-amber-400 bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-200",
              info:
                "border-sky-400 bg-gradient-to-r from-sky-300 via-sky-200 to-cyan-200",
              closeButton:
                "absolute -top-2 -right-2 rounded-full border-2 border-white/80 bg-white/95 p-1 text-[#1f2b7a] shadow-[0_6px_16px_rgba(15,23,42,0.18)] transition hover:brightness-105",
            },
          }}
        />
        <SpeedInsights />
      </body>
    </html>
  )
}
