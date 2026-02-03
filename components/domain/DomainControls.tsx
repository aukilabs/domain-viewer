"use client";

import React, { memo } from "react";
import { useAtomValue } from "jotai";
import { isInIframeAtom, isLoadingAtom } from "@/store/domainStore";
import Navbar from "@/components/Navbar";
import DomainInfo from "@/components/DomainInfo";

/**
 * DomainControls Component
 * 
 * Container for Navbar and DomainInfo components with conditional rendering logic.
 * This component groups UI control components and handles their visibility based on
 * embed mode and hideUI prop.
 * 
 * @example
 * ```tsx
 * <DomainControls 
 *   hideUI={false} 
 *   domainId="abc-123" 
 * />
 * ```
 * 
 * @param props - Component props
 * @param props.hideUI - Whether to hide the UI controls
 * @param props.domainId - The current domain ID
 */
const DomainControls = memo(function DomainControls({ 
  hideUI, 
  domainId 
}: DomainControlsProps) {
  const isInIframe = useAtomValue(isInIframeAtom);
  const isLoading = useAtomValue(isLoadingAtom);

  if (hideUI || isInIframe) {
    return null;
  }

  return (
    <div className="hidden md:block">
      <Navbar currentDomainId={domainId} />
      <DomainInfo />
    </div>
  );
});

/**
 * Props interface for DomainControls component
 * 
 * @interface DomainControlsProps
 * @property {boolean} hideUI - Whether to hide the UI controls
 * @property {string} domainId - The current domain ID
 */
interface DomainControlsProps {
  hideUI: boolean;
  domainId: string;
}

export default DomainControls;
