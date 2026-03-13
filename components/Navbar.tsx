"use client"

import { useState, useEffect, useRef } from "react"
import { useAtomValue } from "jotai"
import { isLoadingAtom, loadingErrorAtom } from "@/store/domainStore"
import { useRouter } from "next/navigation"
import type React from "react"
import { getDomainIdError } from "@/utils/validation"
import { useAnalytics } from "@/hooks/useAnalytics"

interface NavbarProps {
  currentDomainId?: string
}

export default function Navbar({ currentDomainId }: NavbarProps) {
  const isLoading = useAtomValue(isLoadingAtom)
  const loadingError = useAtomValue(loadingErrorAtom)
  const [domainId, setDomainId] = useState(currentDomainId || "")
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { trackDomainSearchInitiated } = useAnalytics()

  useEffect(() => {
    if (currentDomainId) setDomainId(currentDomainId)
  }, [currentDomainId])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDomainId(value)
    setValidationError(getDomainIdError(value))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setDomainId("")
      setValidationError(null)
      inputRef.current?.blur()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const error = getDomainIdError(domainId)
    if (error) {
      setValidationError(error)
      return
    }
    try {
      if (domainId !== currentDomainId) {
        trackDomainSearchInitiated(domainId, "navbar")
        router.push(`/${domainId}`)
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err)
    }
  }

  const hasError = !!validationError || !!loadingError

  return (
    <div className="pointer-events-auto flex flex-col items-center flex-1 max-w-[384px] min-w-0">
      <form
        onSubmit={handleSubmit}
        className={`relative bg-white/10 backdrop-blur-md rounded-[24px] h-12 flex items-center pl-4 pr-1.5 w-full transition-colors ${
          hasError ? "ring-1 ring-red-500/50" : ""
        }`}
        aria-busy={isLoading}
      >
        {isLoading && (
          <div className="w-4 h-4 mr-3 rounded-full border-2 border-white/20 border-t-white animate-spin shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={domainId}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-white placeholder:text-white/50 min-w-0"
          placeholder="Enter domain ID"
          disabled={isLoading}
          aria-label="Domain ID input"
          aria-invalid={hasError}
        />
        <button
          type="submit"
          disabled={isLoading || !!validationError || !domainId.trim()}
          className="shrink-0 h-9 px-4 rounded-[20px] bg-white/15 hover:bg-white/25 text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          Load
        </button>
      </form>
      {validationError && (
        <p className="text-red-400 text-xs mt-1.5 text-center max-w-full truncate">
          {validationError}
        </p>
      )}
      {loadingError && !isLoading && !validationError && (
        <p className="text-red-400 text-xs mt-1.5 text-center max-w-full truncate">
          Failed to load domain
        </p>
      )}
    </div>
  )
}
