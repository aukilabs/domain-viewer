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
import { useAnalytics } from "@/hooks/useAnalytics"

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

  const { trackLayerToggled } = useAnalytics()

  const toggleButtons = React.useMemo(() => {
    const makeToggle = (
      layer: string,
      visible: boolean,
      setter: (fn: (prev: boolean) => boolean) => void,
    ) => () => {
      setter(prev => !prev);
      if (domainId) trackLayerToggled(domainId, layer, !visible);
    };

    const buttons = [
      { icon: QrCode, label: "Toggle Portals", visible: portalsVisible, onClick: makeToggle("portals", portalsVisible, setPortalsVisible) },
      { icon: Map, label: "Toggle Navigation Mesh", visible: navMeshVisible, onClick: makeToggle("nav_mesh", navMeshVisible, setNavMeshVisible) },
      { icon: Box, label: "Toggle Occlusion", visible: occlusionVisible, onClick: makeToggle("occlusion", occlusionVisible, setOcclusionVisible) },
      { icon: Cloud, label: "Toggle Point Cloud", visible: pointCloudVisible, onClick: makeToggle("point_cloud", pointCloudVisible, setPointCloudVisible) },
    ];

    if (hasSplat) {
      buttons.push({
        icon: Sparkles,
        label: "Toggle Gaussian Splat",
        visible: splatVisible,
        onClick: makeToggle("splat", splatVisible, setSplatVisible),
      });
    }

    return buttons;
  }, [
    portalsVisible, setPortalsVisible,
    navMeshVisible, setNavMeshVisible,
    occlusionVisible, setOcclusionVisible,
    pointCloudVisible, setPointCloudVisible,
    splatVisible, setSplatVisible,
    hasSplat, domainId, trackLayerToggled
  ]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between bg-card py-2 z-10 pointer-events-auto">
        <h2 className="text-card-foreground text-base sm:text-xl font-medium">Toggle Visibility</h2>
        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-card-foreground transition-transform ${isOpen ? "" : "rotate-180"}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pointer-events-none">
        <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-2">
          {toggleButtons.map(({ icon, label, visible, onClick }) => (
            <IconButton
              key={label}
              icon={icon}
              active={visible}
              onClick={onClick}
              aria-label={label}
              variant="toggle"
              className="pointer-events-auto"
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

