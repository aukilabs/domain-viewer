/**
 * Custom React Hooks
 * 
 * This module exports all custom hooks used throughout the application.
 * All hooks follow a consistent pattern with TypeScript generics and
 * return standardized loading/error/success state contracts.
 */

// Domain data hooks
export { useDomainData } from "./useDomainData";
export type { UseDomainDataParams, UseDomainDataResult } from "./useDomainData";

// File download hooks
export { useFileDownload } from "./useFileDownload";
export type { UseFileDownloadParams, UseFileDownloadResult } from "./useFileDownload";

export { useDomainFile } from "./useDomainFile";
export type { UseDomainFileParams, UseDomainFileResult } from "./useDomainFile";

// Data parsing hooks
export { usePlyParser } from "./usePlyParser";
export type { UsePlyParserParams, UsePlyParserResult } from "./usePlyParser";

// Splat data hooks
export { useSplatData } from "./useSplatData";
export { useRefinementSplat } from "./useRefinementSplat";
export type { ParsedPartition, RefinementSplatData } from "./useRefinementSplat";
export { useRefinementHasSplat, refinementHasSplat } from "./useRefinementHasSplat";

// Utility hooks
export { default as useInterval } from "./useInterval";
export { useColorScheme } from "./useColorScheme";
export { useDebounce } from "./useDebounce";
export { isMobile } from "./use-mobile";
