/**
 * Utility functions for saving and managing splat files locally
 */

export interface SplatFileInfo {
  fileName: string;
  fileId: string;
  domainId: string;
  size: number;
  timestamp: number;
}

/**
 * Downloads a splat file and saves it to the browser's download folder
 * @param data - ArrayBuffer containing the splat data
 * @param fileName - Name for the downloaded file
 */
export function downloadSplatFile(data: ArrayBuffer, fileName: string): void {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".splat") ? fileName : `${fileName}.splat`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename for a splat based on domain and file IDs
 */
export function generateSplatFileName(domainId: string, fileId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `splat_${domainId}_${fileId}_${timestamp}.splat`;
}

/**
 * Saves splat metadata to localStorage for tracking downloaded files
 */
export function saveSplatMetadata(metadata: SplatFileInfo): void {
  try {
    const existingData = localStorage.getItem("downloaded-splats");
    const splats: SplatFileInfo[] = existingData ? JSON.parse(existingData) : [];
    
    // Check if already exists
    const exists = splats.some(
      (s) => s.fileId === metadata.fileId && s.domainId === metadata.domainId
    );
    
    if (!exists) {
      splats.push(metadata);
      localStorage.setItem("downloaded-splats", JSON.stringify(splats));
    }
  } catch (error) {
    console.error("Failed to save splat metadata:", error);
  }
}

/**
 * Gets list of all downloaded splat metadata
 */
export function getDownloadedSplats(): SplatFileInfo[] {
  try {
    const data = localStorage.getItem("downloaded-splats");
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to get downloaded splats:", error);
    return [];
  }
}

/**
 * Checks if a splat has been downloaded
 */
export function isSplatDownloaded(domainId: string, fileId: string): boolean {
  const splats = getDownloadedSplats();
  return splats.some((s) => s.fileId === fileId && s.domainId === domainId);
}
