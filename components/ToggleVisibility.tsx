"use client"

import { Eye } from "lucide-react"
import * as React from "react"
import { useAtom, useAtomValue } from "jotai"
import {
  portalsVisibleAtom,
  navMeshVisibleAtom,
  occlusionVisibleAtom,
  pointCloudVisibleAtom,
  splatVisibleAtom,
} from "@/store/visualizationStore"
import { hasSplatDataAtom, domainIdAtom } from "@/store/domainStore"
import { useAnalytics } from "@/hooks/useAnalytics"

const LAYERS = [
  { key: "portals", label: "Portals", color: "#3b82f6" },
  { key: "nav_mesh", label: "Nav Mesh", color: "#f59e0b" },
  { key: "occlusion", label: "Occlusion", color: "#ef4444" },
  { key: "point_cloud", label: "Point Cloud", color: "#22c55e" },
  { key: "splat", label: "Rendering", color: "#a855f7" },
] as const

type LayerKey = (typeof LAYERS)[number]["key"]

export function ToggleVisibility() {
  const [isOpen, setIsOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const [portalsVisible, setPortalsVisible] = useAtom(portalsVisibleAtom)
  const [navMeshVisible, setNavMeshVisible] = useAtom(navMeshVisibleAtom)
  const [occlusionVisible, setOcclusionVisible] = useAtom(occlusionVisibleAtom)
  const [pointCloudVisible, setPointCloudVisible] = useAtom(pointCloudVisibleAtom)
  const [splatVisible, setSplatVisible] = useAtom(splatVisibleAtom)
  const hasSplat = useAtomValue(hasSplatDataAtom)
  const domainId = useAtomValue(domainIdAtom)
  const { trackLayerToggled } = useAnalytics()

  const visibilityMap = React.useMemo<
    Record<LayerKey, { visible: boolean; toggle: () => void }>
  >(() => {
    const make = (
      key: string,
      visible: boolean,
      setter: (fn: (prev: boolean) => boolean) => void,
    ) => ({
      visible,
      toggle: () => {
        setter((p) => !p)
        if (domainId) trackLayerToggled(domainId, key, !visible)
      },
    })

    return {
      portals: make("portals", portalsVisible, setPortalsVisible),
      nav_mesh: make("nav_mesh", navMeshVisible, setNavMeshVisible),
      occlusion: make("occlusion", occlusionVisible, setOcclusionVisible),
      point_cloud: make("point_cloud", pointCloudVisible, setPointCloudVisible),
      splat: make("splat", splatVisible, setSplatVisible),
    }
  }, [
    portalsVisible, setPortalsVisible,
    navMeshVisible, setNavMeshVisible,
    occlusionVisible, setOcclusionVisible,
    pointCloudVisible, setPointCloudVisible,
    splatVisible, setSplatVisible,
    domainId, trackLayerToggled,
  ])

  const layers = React.useMemo(
    () => LAYERS.filter((l) => l.key !== "splat" || hasSplat),
    [hasSplat],
  )

  React.useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setIsOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen])

  return (
    <div
      ref={ref}
      className={`pointer-events-auto bg-white/10 backdrop-blur-md rounded-[24px] overflow-hidden shrink-0 transition-[width] duration-300 ease-out ${
        isOpen ? "w-[200px]" : "w-12"
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center h-12 w-full px-3.5 gap-2"
        aria-label="Toggle visibility panel"
      >
        <Eye className="w-5 h-5 text-white shrink-0" />
        <span
          className={`text-sm font-medium text-white whitespace-nowrap transition-opacity duration-200 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          Visibility
        </span>
      </button>

      {/* Expandable content */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/10" />
          <div className="p-2 space-y-1">
            {layers.map((layer) => {
              const { visible, toggle } = visibilityMap[layer.key]
              return (
                <button
                  type="button"
                  key={layer.key}
                  onClick={toggle}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    visible
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
                      style={{
                        backgroundColor: visible ? layer.color : "#666",
                      }}
                    />
                    <span className="whitespace-nowrap">{layer.label}</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      visible ? "bg-white border-white" : "border-white/30"
                    }`}
                  >
                    {visible && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="black"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
