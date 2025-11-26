import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Real world web domain viewer",
  description: "RWW domain visualizer",
  icons: {
    icon: "/images/favicon.png",
  },
  openGraph: {
    title: "Real world web domain viewer",
    description: "RWW domain visualizer",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Auki domain viewer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Real World Web domain viewer",
    description: "Click to view this RWW domain",
    images: ["/images/og-image.png"],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}