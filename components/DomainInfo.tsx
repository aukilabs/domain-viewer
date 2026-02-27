"use client"

import { useState, memo } from "react"
import { ChevronDown, Globe, Clock, Database, Link } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { InfoRow } from "@/components/ui/InfoRow"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ToggleVisibility } from "@/components/ToggleVisibility"
import { useAtomValue } from "jotai"
import { domainInfoAtom } from "@/store/domainStore"
import { useAnalytics } from "@/hooks/useAnalytics"

const DomainInfo = memo(function DomainInfo() {
  const [isDetailsOpen, setIsDetailsOpen] = useState(true)
  const domainInfo = useAtomValue(domainInfoAtom)
  const { trackFieldCopied } = useAnalytics()

  if (!domainInfo) {
    return null
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      trackFieldCopied(domainInfo.id, field)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="fixed inset-4 top-24 w-full overflow-y-auto space-y-2 font-sans md:fixed md:left-4 md:bottom-4 md:w-[400px] md:top-auto pointer-events-none touch-none">
      <Card variant="default" padding="default" className="space-y-4">
        <Collapsible
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between sticky top-0 bg-card py-2 z-10 pointer-events-auto">
            <h2 className="text-card-foreground text-base sm:text-xl font-medium">Domain details</h2>
            <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-card-foreground transition-transform ${isDetailsOpen ? "" : "rotate-180"}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 overflow-y-auto max-h-[calc(100vh-20rem)] pointer-events-none">
            <InfoRow
              icon={Database}
              label="Domain ID"
              value={domainInfo.id}
              onCopy={() => copyToClipboard(domainInfo.id, "id")}
              mono
            />

            <InfoRow
              icon={Globe}
              label="Domain Name"
              value={domainInfo.name}
              onCopy={() => copyToClipboard(domainInfo.name, "name")}
            />

            <InfoRow
              icon={Link}
              label="Domain server address"
              value={domainInfo.url}
              onCopy={() => copyToClipboard(domainInfo.url, "server_address")}
            />

            <InfoRow
              icon={Clock}
              label="Created at"
              value={domainInfo.createdAt}
              onCopy={() => copyToClipboard(domainInfo.createdAt, "created_at")}
              formatValue={(val) => new Date(val).toLocaleString()}
            />

            <InfoRow
              icon={Clock}
              label="Last updated at"
              value={domainInfo.updatedAt}
              onCopy={() => copyToClipboard(domainInfo.updatedAt, "updated_at")}
              formatValue={(val) => new Date(val).toLocaleString()}
            />
          </CollapsibleContent>
        </Collapsible>
      </Card>
      <Card variant="default" padding="default" className="pointer-events-none">
        <ToggleVisibility />
      </Card>
    </div>
  )
});

export default DomainInfo;