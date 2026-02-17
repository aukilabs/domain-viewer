"use client"

import dynamic from "next/dynamic"
import Navbar from "@/components/Navbar"
import Image from "next/image"

const Viewer3D = dynamic(() => import("@/components/Viewer3D"), { ssr: false })

export default function Home() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-card">
      <Viewer3D />
      <Navbar />
      <div className="absolute bottom-4 right-4">
        <Image
          src="/images/logo.svg"
          alt="Auki Logo"
          width={48}
          height={76}
          priority
          className="w-[48px] h-[76px] opacity-60"
        />
      </div>
    </div>
  )
}

