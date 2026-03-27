"use client"

import { useState, useEffect, useRef, memo } from "react"
import { Info, Copy } from "lucide-react"
import { useAtomValue } from "jotai"
import { domainInfoAtom } from "@/store/domainStore"
import { useAnalytics } from "@/hooks/useAnalytics"

const DomainInfo = memo(function DomainInfo() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const domainInfo = useAtomValue(domainInfoAtom)
  const { trackFieldCopied } = useAnalytics()

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setIsOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen])

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      if (domainInfo) trackFieldCopied(domainInfo.id, field)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  if (!domainInfo) return null

  const rows: { label: string; value: string; copyField?: string; format?: (v: string) => string }[] = [
    { label: "Domain ID", value: domainInfo.id, copyField: "id" },
    { label: "Name", value: domainInfo.name, copyField: "name" },
    { label: "Server", value: domainInfo.url, copyField: "server_address" },
    {
      label: "Created",
      value: domainInfo.createdAt,
      copyField: "created_at",
      format: (v) => new Date(v).toLocaleDateString(),
    },
    {
      label: "Updated",
      value: domainInfo.updatedAt,
      copyField: "updated_at",
      format: (v) => new Date(v).toLocaleDateString(),
    },
  ]

  return (
    <div
      ref={ref}
      className={`pointer-events-auto bg-white/10 backdrop-blur-md rounded-[24px] overflow-hidden shrink-0 transition-[width] duration-300 ease-out ${
        isOpen ? "w-[280px]" : "w-12"
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center h-12 w-full px-3.5 gap-2"
        aria-label="Toggle info panel"
      >
        <Info className="w-5 h-5 text-white shrink-0" />
        <span
          className={`text-sm font-medium text-white whitespace-nowrap transition-opacity duration-200 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          Domain Info
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
          <div className="p-3 space-y-0">
            {rows.map((row, i) => {
              const displayVal = row.format ? row.format(row.value) : row.value
              return (
                <div key={row.label}>
                  <div className="flex items-start justify-between gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/50">{row.label}</p>
                      <p className="text-sm text-white truncate mt-0.5">
                        {displayVal}
                      </p>
                    </div>
                    {row.copyField && (
                      <button
                        onClick={() => copyToClipboard(row.value, row.copyField!)}
                        className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0 mt-1"
                        aria-label={`Copy ${row.label}`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {i < rows.length - 1 && (
                    <div className="border-b border-white/5" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})

export default DomainInfo
