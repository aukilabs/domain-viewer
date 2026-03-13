"use client"

import dynamic from "next/dynamic"
import Navbar from "@/components/Navbar"

const Viewer3D = dynamic(() => import("@/components/Viewer3D"), { ssr: false })

export default function Home() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#050505]">
      <Viewer3D />
      <div className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none">
        <div className="flex items-end justify-center gap-3 px-4 sm:px-6">
          <Navbar />
        </div>
      </div>
    </div>
  )
}
