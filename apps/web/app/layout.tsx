import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { SpeedInsights } from "@vercel/speed-insights/next"

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
        <SpeedInsights />
      </body>
    </html>
  )
}
