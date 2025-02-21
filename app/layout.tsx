import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Auki spatial domain viewer",
  description: "View and analyze spatial domain information in 3D",
  icons: {
    icon: "/images/favicon.png",
  },
  openGraph: {
    title: "Auki spatial domain viewer",
    description: "View and analyze spatial domain information in 3D",
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
    title: "Auki spatial domain viewer",
    description: "View and analyze spatial domain information in 3D",
    images: ["/images/og-image.png"],
  },
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}



import './globals.css'