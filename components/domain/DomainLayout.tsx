"use client";

import React, { memo } from "react";
import { useAtomValue } from "jotai";
import { isInIframeAtom, isLoadingAtom } from "@/store/domainStore";
import Viewer3D from "@/components/Viewer3D";
import DomainControls from "@/components/domain/DomainControls";
import Image from "next/image";

/**
 * DomainLayout Component
 * 
 * Manages the visual layout structure of the domain viewer page.
 * This component composes the main container, 3D viewer, UI controls, and branding elements.
 * 
 * @example
 * ```tsx
 * <DomainLayout hideUI={false} domainId="abc-123">
 *   <DomainLoader domainId="abc-123" />
 * </DomainLayout>
 * ```
 * 
 * @param props - Component props
 * @param props.hideUI - Whether to hide the UI controls
 * @param props.domainId - The current domain ID
 * @param props.children - Optional children (typically DomainLoader)
 */
const DomainLayout = memo(function DomainLayout({ 
  hideUI, 
  domainId, 
  children 
}: DomainLayoutProps) {
  const isInIframe = useAtomValue(isInIframeAtom);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-card">
      {children}
      <Viewer3D isEmbed={isInIframe} />
      <DomainControls
        hideUI={hideUI}
        domainId={domainId}
      />
      <div className="absolute bottom-4 right-4">
        <Image
          src="/images/logo.svg"
          alt="Auki Logo"
          width={48}
          height={76}
          priority
          className="w-[48px] h-[76px] opacity-60"
        />
      </div>
    </div>
  );
});

/**
 * Props interface for DomainLayout component
 * 
 * @interface DomainLayoutProps
 * @property {boolean} hideUI - Whether to hide the UI controls
 * @property {string} domainId - The current domain ID
 * @property {React.ReactNode} [children] - Optional children components
 */
interface DomainLayoutProps {
  hideUI: boolean;
  domainId: string;
  children?: React.ReactNode;
}

export default DomainLayout;
