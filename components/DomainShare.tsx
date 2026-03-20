"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { Share2, Link, Code, Camera, Check } from "lucide-react"
import { useAtomValue } from "jotai"
import { domainIdAtom } from "@/store/domainStore"

type CopiedField = "url" | "embed" | null

const DomainShare = memo(function DomainShare() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const domainId = useAtomValue(domainIdAtom)
  const [copied, setCopied] = useState<CopiedField>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(null)

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

  const flashCopied = useCallback((field: CopiedField) => {
    setCopied(field)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(null), 1500)
  }, [])

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      flashCopied("url")
    } catch (err) {
      console.error("Failed to copy URL:", err)
    }
  }, [flashCopied])

  const copyEmbed = useCallback(async () => {
    if (!domainId) return
    const src = `${window.location.origin}/${domainId}/preview`
    const code = `<iframe src="${src}" width="1200" height="630" style="border:0;" allowfullscreen loading="lazy"></iframe>`
    try {
      await navigator.clipboard.writeText(code)
      flashCopied("embed")
    } catch (err) {
      console.error("Failed to copy embed code:", err)
    }
  }, [domainId, flashCopied])

  const takeScreenshot = useCallback(async () => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas) return

    const offscreen = document.createElement("canvas")
    offscreen.width = canvas.width
    offscreen.height = canvas.height
    const ctx = offscreen.getContext("2d")
    if (!ctx) return

    ctx.drawImage(canvas, 0, 0)

    try {
      const logoImg = new Image()
      logoImg.crossOrigin = "anonymous"
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve()
        logoImg.onerror = reject
        logoImg.src = "/images/logo.svg"
      })
      const logoH = Math.round(offscreen.height * 0.08)
      const logoW = Math.round(logoH * (logoImg.naturalWidth / logoImg.naturalHeight))
      const padding = Math.round(offscreen.height * 0.03)
      ctx.globalAlpha = 0.6
      ctx.drawImage(
        logoImg,
        offscreen.width - logoW - padding,
        offscreen.height - logoH - padding,
        logoW,
        logoH,
      )
      ctx.globalAlpha = 1
    } catch {
      // logo failed to load — proceed without it
    }

    offscreen.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = domainId ? `domain-${domainId}.png` : "screenshot.png"
      a.click()
      URL.revokeObjectURL(url)
    }, "image/png")
  }, [domainId])

  if (!domainId) return null

  const actions: { key: string; label: string; icon: typeof Link; onClick: () => void; copiedKey?: CopiedField }[] = [
    { key: "url", label: "Copy URL", icon: Link, onClick: copyUrl, copiedKey: "url" },
    { key: "embed", label: "Copy Embed", icon: Code, onClick: copyEmbed, copiedKey: "embed" },
    { key: "screenshot", label: "Screenshot", icon: Camera, onClick: takeScreenshot },
  ]

  return (
    <div
      ref={ref}
      className={`pointer-events-auto bg-white/10 backdrop-blur-md rounded-[24px] overflow-hidden shrink-0 transition-[width] duration-300 ease-out ${
        isOpen ? "w-[200px]" : "w-12"
      }`}
    >
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center h-12 w-full px-3.5 gap-2"
        aria-label="Toggle share panel"
      >
        <Share2 className="w-5 h-5 text-white shrink-0" />
        <span
          className={`text-sm font-medium text-white whitespace-nowrap transition-opacity duration-200 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          Share
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/10" />
          <div className="p-2 space-y-1">
            {actions.map((action) => {
              const Icon = action.icon
              const isCopied = action.copiedKey != null && copied === action.copiedKey
              return (
                <button
                  type="button"
                  key={action.key}
                  onClick={action.onClick}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <Icon className="w-4 h-4 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">
                    {isCopied ? "Copied!" : action.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})

export default DomainShare
