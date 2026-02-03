"use client"

import { ChevronDown, Cloud, QrCode, Map, Box, Sparkles } from "lucide-react"
import * as React from "react"
import { IconButton } from "@/components/ui/IconButton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DownloadSplatButton } from "@/components/DownloadSplatButton"
import { useAtom, useAtomValue } from "jotai"
import {
  portalsVisibleAtom,
  navMeshVisibleAtom,
  occlusionVisibleAtom,
  pointCloudVisibleAtom,
  splatVisibleAtom,
} from "@/store/visualizationStore"
import {
  hasSplatDataAtom,
  splatArrayBufferAtom,
  domainIdAtom,
  splatDataAtom,
} from "@/store/domainStore"

export function ToggleVisibility() {
  const [isOpen, setIsOpen] = React.useState(true)
  
  // Visibility atoms
  const [portalsVisible, setPortalsVisible] = useAtom(portalsVisibleAtom)
  const [navMeshVisible, setNavMeshVisible] = useAtom(navMeshVisibleAtom)
  const [occlusionVisible, setOcclusionVisible] = useAtom(occlusionVisibleAtom)
  const [pointCloudVisible, setPointCloudVisible] = useAtom(pointCloudVisibleAtom)
  const [splatVisible, setSplatVisible] = useAtom(splatVisibleAtom)
  
  // Data atoms
  const hasSplat = useAtomValue(hasSplatDataAtom)
  const splatArrayBuffer = useAtomValue(splatArrayBufferAtom)
  const domainId = useAtomValue(domainIdAtom)
  const splatData = useAtomValue(splatDataAtom)

  // Memoize toggle buttons to prevent recreation on every render
  const toggleButtons = React.useMemo(() => {
    const buttons = [
      { icon: QrCode, label: "Toggle Portals", visible: portalsVisible, onClick: () => setPortalsVisible(prev => !prev) },
      { icon: Map, label: "Toggle Navigation Mesh", visible: navMeshVisible, onClick: () => setNavMeshVisible(prev => !prev) },
      { icon: Box, label: "Toggle Occlusion", visible: occlusionVisible, onClick: () => setOcclusionVisible(prev => !prev) },
      { icon: Cloud, label: "Toggle Point Cloud", visible: pointCloudVisible, onClick: () => setPointCloudVisible(prev => !prev) },
    ];

    // Add splat button only if splat data exists
    if (hasSplat) {
      buttons.push({
        icon: Sparkles,
        label: "Toggle Gaussian Splat",
        visible: splatVisible,
        onClick: () => setSplatVisible(prev => !prev),
      });
    }

    return buttons;
  }, [
    portalsVisible, setPortalsVisible,
    navMeshVisible, setNavMeshVisible,
    occlusionVisible, setOcclusionVisible,
    pointCloudVisible, setPointCloudVisible,
    splatVisible, setSplatVisible,
    hasSplat
  ]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between bg-card py-2 z-10">
        <h2 className="text-card-foreground text-base sm:text-xl font-medium">Toggle Visibility</h2>
        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-card-foreground transition-transform ${isOpen ? "" : "rotate-180"}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2">
          {toggleButtons.map(({ icon, label, visible, onClick }) => (
            <IconButton
              key={label}
              icon={icon}
              active={visible}
              onClick={onClick}
              aria-label={label}
              variant="toggle"
            />
          ))}
        </div>
        {/* Download button hidden per user request */}
        {/* {hasSplat && splatArrayBuffer && domainId && splatData?.fileId && (
          <DownloadSplatButton
            data={splatArrayBuffer}
            domainId={domainId}
            fileId={splatData.fileId}
            className="w-full"
          />
        )} */}
      </CollapsibleContent>
    </Collapsible>
  )
}

