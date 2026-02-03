"use client"

import { useState, useEffect, useRef } from "react"
import { useAtomValue } from "jotai"
import { isLoadingAtom, loadingErrorAtom } from "@/store/domainStore"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { Card } from "@/components/ui/Card"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import type React from "react"
import { getDomainIdError } from "@/utils/validation"
import { 
  DataNotFoundError, 
  NetworkError, 
  AuthenticationError 
} from "@/services/errors"

interface NavbarProps {
  currentDomainId?: string
}

export default function Navbar({ currentDomainId }: NavbarProps) {
  const isLoading = useAtomValue(isLoadingAtom);
  const loadingError = useAtomValue(loadingErrorAtom);
  const [domainId, setDomainId] = useState(currentDomainId || "")
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (currentDomainId) {
      setDomainId(currentDomainId)
    }
  }, [currentDomainId])

  // Auto-focus input on page load
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDomainId(value)
    
    // Validate input
    const error = getDomainIdError(value)
    setValidationError(error)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setDomainId("")
      setValidationError(null)
      inputRef.current?.blur()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate before submission
    const error = getDomainIdError(domainId)
    if (error) {
      setValidationError(error)
      return
    }

    try {
      // Always just navigate to the new domain ID
      if (domainId !== currentDomainId) {
        router.push(`/${domainId}`)
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err)
    }
  }

  // Get user-friendly error message
  const getErrorMessage = (error: string | null): { message: string; suggestion: string } | null => {
    if (!error) return null

    // Check if error contains specific error type information
    if (error.includes('404') || error.toLowerCase().includes('not found')) {
      return {
        message: 'Domain not found',
        suggestion: 'Check the domain ID and try again'
      }
    }
    
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('connection')) {
      return {
        message: 'Network connection failed',
        suggestion: 'Check your connection and retry'
      }
    }
    
    if (error.toLowerCase().includes('auth') || error.toLowerCase().includes('access')) {
      return {
        message: 'Access denied',
        suggestion: 'Contact support for access'
      }
    }
    
    return {
      message: 'Failed to load domain',
      suggestion: 'Please try again'
    }
  }

  const errorInfo = getErrorMessage(loadingError)

  return (
    <nav className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 h-auto min-h-14 bg-background flex items-center justify-between px-2 md:px-4 py-2 rounded-2xl border border-border border-[0.5px] z-10">
      <div className="flex items-center w-full md:w-auto">
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

        <div className="flex items-center ml-4 md:ml-8 flex-1 md:flex-initial">
          <div className="hidden md:block h-14 w-px bg-border" />
          <form 
            onSubmit={handleSubmit} 
            className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 px-2 md:px-6 w-full md:w-auto"
            aria-busy={isLoading}
          >
            <span className="hidden sm:inline text-foreground text-sm font-medium">Domain id:</span>
            <div className="relative w-full">
              <div className="relative">
                {isLoading && (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Input
                  ref={inputRef}
                  type="text"
                  value={domainId}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className={`w-full max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[480px] h-10 bg-card border-0 text-foreground text-sm focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0 focus:outline-none ${isLoading ? 'opacity-50 pl-10' : ''} ${validationError ? 'ring-1 ring-destructive' : ''}`}
                  placeholder="Enter domain ID (Esc to clear)"
                  disabled={isLoading}
                  aria-label="Domain ID input"
                  aria-invalid={!!validationError}
                  aria-describedby={validationError ? "validation-error" : undefined}
                />
                <Button
                  type="submit"
                  className="absolute right-1 top-1 h-8 px-4 md:px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md"
                  disabled={isLoading || !!validationError || !domainId.trim()}
                >
                  {isLoading ? "Loading..." : "Load"}
                </Button>
              </div>
              {validationError && (
                <p 
                  id="validation-error" 
                  className="text-destructive text-xs mt-1 absolute left-0 top-full whitespace-nowrap"
                >
                  {validationError}
                </p>
              )}
            </div>
          </form>
          <div className="hidden md:block h-14 w-px bg-border" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isLoading && (
          <div className="flex items-center gap-3 bg-card/80 px-3 md:px-4 py-2 rounded-full">
            <LoadingSpinner size="default" label="Loading domain data..." />
            <span className="hidden md:inline text-foreground text-sm font-medium">Loading domain data...</span>
          </div>
        )}
        {errorInfo && !isLoading && (
          <Card 
            variant="default" 
            padding="sm" 
            className="flex items-start gap-2 max-w-xs md:max-w-md border border-destructive/50 bg-destructive/10"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-destructive text-sm font-medium">{errorInfo.message}</p>
              <p className="text-destructive/80 text-xs">{errorInfo.suggestion}</p>
            </div>
          </Card>
        )}
      </div>
    </nav>
  )
}

