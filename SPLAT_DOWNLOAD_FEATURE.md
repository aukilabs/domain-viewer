# Splat Download Feature

This document describes the implementation of the splat file download feature that allows users to save Gaussian splat files to their local machine.

## Overview

The feature adds a "Download Splat" button to the domain viewer UI that enables users to download `.splat` files from domain data to their local filesystem. The downloaded files can be used for offline viewing, archiving, or further processing.

## Implementation

### New Files

1. **`utils/splat-storage.ts`** - Utility functions for managing splat downloads:
   - `downloadSplatFile()` - Downloads a splat file using the browser's download mechanism
   - `generateSplatFileName()` - Creates standardized filenames with timestamps
   - `saveSplatMetadata()` - Stores download metadata in localStorage
   - `getDownloadedSplats()` - Retrieves list of all downloaded splats
   - `isSplatDownloaded()` - Checks if a specific splat has been downloaded

2. **`components/DownloadSplatButton.tsx`** - React component for the download button:
   - Shows download progress state
   - Displays a checkmark when file has been downloaded
   - Tracks download status in localStorage
   - Handles ArrayBuffer to Blob conversion for downloads

### Modified Files

1. **`components/SplatViewer.tsx`**
   - Added `onDataLoaded` callback prop to expose loaded splat data
   - Notifies parent components when splat data is successfully loaded

2. **`components/Viewer3D.tsx`**
   - Added `onSplatDataLoaded` callback prop
   - Passes the callback to SplatViewer component

3. **`app/[id]/ClientPage.tsx`**
   - Added `splatArrayBuffer` state to store loaded splat data
   - Added `handleSplatDataLoaded` callback
   - Passes splat data and metadata to DomainInfo component

4. **`components/DomainInfo.tsx`**
   - Added `splatData`, `domainId`, and `splatFileId` props
   - Passes props to ToggleVisibility component

5. **`components/ToggleVisibility.tsx`**
   - Added `splatData`, `domainId`, and `splatFileId` props
   - Renders DownloadSplatButton when splat data is available

## Features

### Download Button States

1. **Default State**: Shows "Download Splat" with download icon
2. **Downloading State**: Shows "Downloading..." with animated icon
3. **Downloaded State**: Shows "Downloaded" with checkmark icon

### File Naming Convention

Downloaded files follow this format:
```
splat_{domainId}_{fileId}_{timestamp}.splat
```

Example: `splat_abc123_xyz789_2026-01-30T12-34-56-789Z.splat`

### Download Tracking

The feature tracks downloaded splats in browser localStorage:
- Stores file metadata (name, size, timestamp, domainId, fileId)
- Prevents duplicate downloads
- Persists across browser sessions

## Usage

1. Open a domain that contains Gaussian splat data
2. The "Download Splat" button will appear in the "Toggle Visibility" section
3. Click the button to download the splat file
4. The file will be saved to your browser's default download location
5. The button will show "Downloaded" to indicate successful download

## Technical Details

### Data Flow

```
SplatViewer (loads data)
    ↓
onDataLoaded callback
    ↓
Viewer3D (receives ArrayBuffer)
    ↓
onSplatDataLoaded callback
    ↓
ClientPage (stores in state)
    ↓
DomainInfo (passes props)
    ↓
ToggleVisibility (renders button)
    ↓
DownloadSplatButton (handles download)
```

### Storage Format

Downloaded splats are stored as `.splat` files (binary format compatible with SparkJS and other Gaussian splatting viewers).

### Browser Compatibility

The download feature uses standard Web APIs:
- `Blob` API for file creation
- `URL.createObjectURL()` for download links
- `localStorage` for metadata tracking

All modern browsers (Chrome, Firefox, Safari, Edge) are supported.

## Future Enhancements

Potential improvements:
- Bulk download multiple splats
- Download progress indicator for large files
- Option to choose download location (browser limitations apply)
- Export to different formats (PLY, compressed formats)
- Integration with local file system API for directory access
