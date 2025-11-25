"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import type React from "react"

interface NavbarProps {
  onDomainInfoLoaded: (domainInfo: any, pointCloudData: ArrayBuffer | null) => void
  currentDomainId?: string
  isLoading?: boolean
}

export default function Navbar({ onDomainInfoLoaded, currentDomainId, isLoading = false }: NavbarProps) {
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
    <nav className="absolute top-4 left-4 right-4 h-14 bg-[#191919] flex items-center justify-between px-4 rounded-2xl border border-[#282828] border-[0.5px] z-10">
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <Image
            src="/images/domain-viewer-logo.png"
            alt="Domain Viewer Logo"
            width={24}
            height={24}
            className="text-[#ff5d48]"
          />
          <span className="text-[#ffffff] text-sm font-normal">domain viewer</span>
        </div>

        <div className="flex items-center ml-8">
          <div className="h-14 w-px bg-[#282828]" />
          <form onSubmit={handleSubmit} className="flex items-center gap-3 px-6">
            <span className="text-[#ffffff] text-sm font-medium">Domain id:</span>
            <div className="relative">
              <Input
                type="text"
                value={domainId}
                onChange={(e) => setDomainId(e.target.value)}
                className="w-[480px] h-10 bg-[#282828] border-0 text-[#ffffff] text-sm focus-visible:ring-1 focus-visible:ring-[#4a4a4a] focus-visible:ring-offset-0 focus:outline-none"
                placeholder="Enter domain ID"
                disabled={isLoading}
              />
              <Button
                type="submit"
                className="absolute right-1 top-1 h-8 px-6 bg-[#ff5d48] hover:bg-[#ff5d48]/90 text-[#ffffff] text-sm font-medium rounded-md"
                disabled={isLoading}
              >
                Load
              </Button>
            </div>
          </form>
          <div className="h-14 w-px bg-[#282828]" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isLoading && (
          <div className="flex items-center gap-3 bg-[#282828]/80 px-4 py-2 rounded-full">
            <div className="relative h-5 w-5">
              <svg className="absolute inset-0 h-full w-full animate-spin" viewBox="0 0 24 24">
                <circle className="stroke-[#282828]" cx="12" cy="12" r="10" strokeWidth="3" fill="none" />
                <circle
                  className="stroke-[#ff5d48]"
                  cx="12"
                  cy="12"
                  r="10"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="60"
                  strokeDashoffset="20"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-[#ffffff] text-sm font-medium">Loading domain data...</span>
          </div>
        )}
        {error && (
          <div className="text-[#ff5d48] text-sm max-w-md overflow-hidden text-ellipsis whitespace-nowrap">
            Error: {error}
          </div>
        )}
      </div>
    </nav>
  )
}

