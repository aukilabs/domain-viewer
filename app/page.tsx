"use client"

import Navbar from "@/components/Navbar"
import Viewer3D from "@/components/Viewer3D"
import Image from "next/image"

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

