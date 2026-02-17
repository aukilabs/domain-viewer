"use client";

import { useState } from "react";
import { Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  downloadSplatFile,
  generateSplatFileName,
  saveSplatMetadata,
  isSplatDownloaded,
} from "@/utils/splat-storage";

interface DownloadSplatButtonProps {
  data: ArrayBuffer | null;
  domainId: string;
  fileId: string;
  className?: string;
}

/**
 * Button component for downloading splat files to local storage
 */
export function DownloadSplatButton({
  data,
  domainId,
  fileId,
  className,
}: DownloadSplatButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(
    isSplatDownloaded(domainId, fileId)
  );

  const handleDownload = () => {
    if (!data) {
      console.error("No splat data available for download");
      return;
    }

    setIsDownloading(true);

    try {
      const fileName = generateSplatFileName(domainId, fileId);
      downloadSplatFile(data, fileName);

      // Save metadata
      saveSplatMetadata({
        fileName,
        fileId,
        domainId,
        size: data.byteLength,
        timestamp: Date.now(),
      });

      setDownloaded(true);
      console.log(`[DownloadSplatButton] Successfully downloaded: ${fileName}`);
    } catch (error) {
      console.error("[DownloadSplatButton] Failed to download splat:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!data) {
    return null;
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      variant={downloaded ? "outline" : "default"}
      size="sm"
      className={className}
    >
      {isDownloading ? (
        <>
          <Download className="mr-2 h-4 w-4 animate-pulse" />
          Downloading...
        </>
      ) : downloaded ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Downloaded
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download Splat
        </>
      )}
    </Button>
  );
}
