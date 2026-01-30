"use client"

import { ChevronDown, Cloud, QrCode, Map, Box, Sparkles } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DownloadSplatButton } from "@/components/DownloadSplatButton"

interface ToggleVisibilityProps {
  onTogglePortals: () => void
  portalsVisible: boolean
  onToggleNavMesh: () => void
  navMeshVisible: boolean
  onToggleOcclusion: () => void
  occlusionVisible: boolean
  onTogglePointCloud: () => void
  pointCloudVisible: boolean
  onToggleSplat: () => void
  splatVisible: boolean
  hasSplat: boolean
  splatData?: ArrayBuffer | null
  domainId?: string
  splatFileId?: string
}

export function ToggleVisibility({ 
  onTogglePortals, 
  portalsVisible, 
  onToggleNavMesh, 
  navMeshVisible,
  onToggleOcclusion,
  occlusionVisible,
  onTogglePointCloud,
  pointCloudVisible,
  onToggleSplat,
  splatVisible,
  hasSplat,
  splatData,
  domainId,
  splatFileId
}: ToggleVisibilityProps) {
  const [isOpen, setIsOpen] = React.useState(true)

  // Memoize toggle buttons to prevent recreation on every render
  const toggleButtons = React.useMemo(() => {
    const buttons = [
      { icon: QrCode, label: "Toggle Portals", visible: portalsVisible, onClick: onTogglePortals },
      { icon: Map, label: "Toggle Navigation Mesh", visible: navMeshVisible, onClick: onToggleNavMesh },
      { icon: Box, label: "Toggle Occlusion", visible: occlusionVisible, onClick: onToggleOcclusion },
      { icon: Cloud, label: "Toggle Point Cloud", visible: pointCloudVisible, onClick: onTogglePointCloud },
    ];

    // Add splat button only if splat data exists
    if (hasSplat) {
      buttons.push({
        icon: Sparkles,
        label: "Toggle Gaussian Splat",
        visible: splatVisible,
        onClick: onToggleSplat,
      });
    }

    return buttons;
  }, [
    portalsVisible, onTogglePortals,
    navMeshVisible, onToggleNavMesh,
    occlusionVisible, onToggleOcclusion,
    pointCloudVisible, onTogglePointCloud,
    splatVisible, onToggleSplat,
    hasSplat
  ]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between bg-[#282828] py-2 z-10">
        <h2 className="text-[#fafafa] text-base sm:text-xl font-medium">Toggle Visibility</h2>
        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-[#fafafa] transition-transform ${isOpen ? "" : "rotate-180"}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2">
          {toggleButtons.map(({ icon: Icon, label, visible, onClick }) => (
            <button
              key={label}
              className={cn(
                "flex h-8 sm:h-10 w-full items-center justify-center rounded-lg text-[#fafafa] sm:w-10",
                visible ? "bg-[#ff5d48] hover:bg-[#ff5d48]/90" : "bg-[#191919] hover:bg-[#191919]/90"
              )}
              aria-label={label}
              onClick={onClick}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          ))}
        </div>
        {/* Download button hidden per user request */}
        {/* {hasSplat && splatData && domainId && splatFileId && (
          <DownloadSplatButton
            data={splatData}
            domainId={domainId}
            fileId={splatFileId}
            className="w-full"
          />
        )} */}
      </CollapsibleContent>
    </Collapsible>
  )
}

