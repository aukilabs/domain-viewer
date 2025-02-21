"use client"

import Navbar from "@/components/Navbar"
import Viewer3D from "@/components/Viewer3D"
import Image from "next/image"

export default function Home() {
  const handleDomainInfoLoaded = () => {
    // This is intentionally empty as we'll handle loading in the [id] page
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#282828]">
      <Viewer3D
        pointCloudData={null}
        occlusionMeshData={null}
        navMeshData={null}
      />
      <Navbar onDomainInfoLoaded={handleDomainInfoLoaded} />
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

