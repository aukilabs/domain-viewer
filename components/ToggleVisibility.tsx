"use client"

import { ChevronDown, Cloud, QrCode, Map, Box } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface ToggleVisibilityProps {
  onTogglePortals: () => void
  portalsVisible: boolean
  onToggleNavMesh: () => void
  navMeshVisible: boolean
  onToggleOcclusion: () => void
  occlusionVisible: boolean
  onTogglePointCloud: () => void
  pointCloudVisible: boolean
}

export function ToggleVisibility({ 
  onTogglePortals, 
  portalsVisible, 
  onToggleNavMesh, 
  navMeshVisible,
  onToggleOcclusion,
  occlusionVisible,
  onTogglePointCloud,
  pointCloudVisible
}: ToggleVisibilityProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between">
        <h2 className="text-[#fafafa] text-xl font-medium">Toggle Visibility</h2>
        <ChevronDown className={`h-5 w-5 text-[#fafafa] transition-transform ${isOpen ? "" : "rotate-180"}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <div className="flex gap-2">
          <button
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-[#fafafa]",
              portalsVisible ? "bg-[#ff5d48] hover:bg-[#ff5d48]/90" : "bg-[#191919] hover:bg-[#191919]/90"
            )}
            aria-label="QR Code"
            onClick={onTogglePortals}
          >
            <QrCode className="h-5 w-5" />
          </button>
          <button
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-[#fafafa]",
              navMeshVisible ? "bg-[#ff5d48] hover:bg-[#ff5d48]/90" : "bg-[#191919] hover:bg-[#191919]/90"
            )}
            aria-label="Map"
            onClick={onToggleNavMesh}
          >
            <Map className="h-5 w-5" />
          </button>
          <button
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-[#fafafa]",
              occlusionVisible ? "bg-[#ff5d48] hover:bg-[#ff5d48]/90" : "bg-[#191919] hover:bg-[#191919]/90"
            )}
            aria-label="Box"
            onClick={onToggleOcclusion}
          >
            <Box className="h-5 w-5" />
          </button>
          <button
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-[#fafafa]",
              pointCloudVisible ? "bg-[#ff5d48] hover:bg-[#ff5d48]/90" : "bg-[#191919] hover:bg-[#191919]/90"
            )}
            aria-label="Cloud"
            onClick={onTogglePointCloud}
          >
            <Cloud className="h-5 w-5" />
          </button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

