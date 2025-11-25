import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Real world web domain viewer",
  description: "See the world through the eyes of AI",
  icons: {
    icon: "/images/favicon.png",
  },
  openGraph: {
    title: "Real world web domain viewer",
    description: "See the world through the eyes of AI",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Auki domain viewer interface showing a 3D point cloud visualization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Real world web domain viewer",
    description: "See the world through the eyes of AI",
    images: ["/images/og-image.png"],
  },
  generator: 'v0.dev',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://preview-on-x.ngrok.app'),
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