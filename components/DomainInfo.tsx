"use client"

import { useState } from "react"
import { Copy, ChevronDown, Globe, Clock, Database, Link } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ToggleVisibility } from "@/components/ToggleVisibility"

interface DomainInfoProps {
  domainInfo: {
    id: string
    name: string
    createdAt: string
    updatedAt: string
    url: string
  }
  onTogglePortals: () => void
  portalsVisible: boolean
  onToggleNavMesh: () => void
  navMeshVisible: boolean
  onToggleOcclusion: () => void
  occlusionVisible: boolean
  onTogglePointCloud: () => void
  pointCloudVisible: boolean
}

export default function DomainInfo({ 
  domainInfo, 
  onTogglePortals, 
  portalsVisible,
  onToggleNavMesh,
  navMeshVisible,
  onToggleOcclusion,
  occlusionVisible,
  onTogglePointCloud,
  pointCloudVisible
}: DomainInfoProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(true)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="fixed inset-4 top-24 w-full overflow-y-auto space-y-2 font-sans md:fixed md:left-4 md:bottom-4 md:w-[400px] md:top-auto">
      <Collapsible
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        className="rounded-xl bg-[#282828] p-4 space-y-4"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between sticky top-0 bg-[#282828] py-2 z-10">
          <h2 className="text-[#fafafa] text-base sm:text-xl font-medium">Domain details</h2>
          <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-[#fafafa] transition-transform ${isDetailsOpen ? "" : "rotate-180"}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 overflow-y-auto max-h-[calc(100vh-20rem)]">
          {/* Domain ID */}
          <div className="rounded-lg bg-[#191919] p-3">
            <div className="flex items-center justify-between text-[#626262] text-sm mb-1">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Domain ID</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#fafafa] hover:bg-[#fafafa]/10"
                onClick={() => copyToClipboard(domainInfo.id)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[#fafafa] text-sm font-mono">{domainInfo.id}</div>
          </div>

          {/* Domain Name */}
          <div className="rounded-lg bg-[#191919] p-3">
            <div className="flex items-center justify-between text-[#626262] text-sm mb-1">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Domain Name</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#fafafa] hover:bg-[#fafafa]/10"
                onClick={() => copyToClipboard(domainInfo.name)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[#fafafa] text-sm">{domainInfo.name}</div>
          </div>

          {/* Server URL */}
          <div className="rounded-lg bg-[#191919] p-3">
            <div className="flex items-center justify-between text-[#626262] text-sm mb-1">
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                <span>Domain server address</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#fafafa] hover:bg-[#fafafa]/10"
                onClick={() => copyToClipboard(domainInfo.url)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[#fafafa] text-sm break-all">{domainInfo.url}</div>
          </div>

          {/* Created At */}
          <div className="rounded-lg bg-[#191919] p-3">
            <div className="flex items-center justify-between text-[#626262] text-sm mb-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Created at</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#fafafa] hover:bg-[#fafafa]/10"
                onClick={() => copyToClipboard(domainInfo.createdAt)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[#fafafa] text-sm">{new Date(domainInfo.createdAt).toLocaleString()}</div>
          </div>

          {/* Updated At */}
          <div className="rounded-lg bg-[#191919] p-3">
            <div className="flex items-center justify-between text-[#626262] text-sm mb-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Last updated at</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[#fafafa] hover:bg-[#fafafa]/10"
                onClick={() => copyToClipboard(domainInfo.updatedAt)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[#fafafa] text-sm">{new Date(domainInfo.updatedAt).toLocaleString()}</div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible className="rounded-xl bg-[#282828] p-4">
        <ToggleVisibility 
          onTogglePortals={onTogglePortals}
          portalsVisible={portalsVisible}
          onToggleNavMesh={onToggleNavMesh}
          navMeshVisible={navMeshVisible}
          onToggleOcclusion={onToggleOcclusion}
          occlusionVisible={occlusionVisible}
          onTogglePointCloud={onTogglePointCloud}
          pointCloudVisible={pointCloudVisible}
        />
      </Collapsible>
    </div>
  )
}

