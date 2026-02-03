"use client"

import { useState, useEffect } from "react"
import { useAtomValue } from "jotai"
import { isLoadingAtom } from "@/store/domainStore"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { useRouter } from "next/navigation"
import type React from "react"

interface NavbarProps {
  onDomainInfoLoaded: (domainInfo: any, pointCloudData: ArrayBuffer | null) => void
  currentDomainId?: string
}

export default function Navbar({ onDomainInfoLoaded, currentDomainId }: NavbarProps) {
  const isLoading = useAtomValue(isLoadingAtom);
  const [domainId, setDomainId] = useState(currentDomainId || "")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (currentDomainId) {
      setDomainId(currentDomainId)
    }
  }, [currentDomainId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!domainId) return

    setError(null)

    try {
      // Always just navigate to the new domain ID
      if (domainId !== currentDomainId) {
        router.push(`/${domainId}`)
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <nav className="absolute top-4 left-4 right-4 h-14 bg-background flex items-center justify-between px-4 rounded-2xl border border-border border-[0.5px] z-10">
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <Image
            src="/images/domain-viewer-logo.png"
            alt="Domain Viewer Logo"
            width={24}
            height={24}
            className="text-primary"
          />
          <span className="text-foreground text-sm font-normal">domain viewer</span>
        </div>

        <div className="flex items-center ml-8">
          <div className="h-14 w-px bg-border" />
          <form onSubmit={handleSubmit} className="flex items-center gap-3 px-6">
            <span className="text-foreground text-sm font-medium">Domain id:</span>
            <div className="relative">
              <Input
                type="text"
                value={domainId}
                onChange={(e) => setDomainId(e.target.value)}
                className="w-[480px] h-10 bg-card border-0 text-foreground text-sm focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0 focus:outline-none"
                placeholder="Enter domain ID"
                disabled={isLoading}
              />
              <Button
                type="submit"
                className="absolute right-1 top-1 h-8 px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md"
                disabled={isLoading}
              >
                Load
              </Button>
            </div>
          </form>
          <div className="h-14 w-px bg-border" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isLoading && (
          <div className="flex items-center gap-3 bg-card/80 px-4 py-2 rounded-full">
            <LoadingSpinner size="default" label="Loading domain data..." />
            <span className="text-foreground text-sm font-medium">Loading domain data...</span>
          </div>
        )}
        {error && (
          <div className="text-primary text-sm max-w-md overflow-hidden text-ellipsis whitespace-nowrap">
            Error: {error}
          </div>
        )}
      </div>
    </nav>
  )
}

