"use client";

import React, { memo, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { isInIframeAtom, isLoadingAtom, splatLoadingAtom } from "@/store/domainStore";
import Viewer3D from "@/components/Viewer3D";
import DomainControls from "@/components/domain/DomainControls";
import Image from "next/image";

function LoadingOverlay() {
  const isLoading = useAtomValue(isLoadingAtom);
  const splatLoading = useAtomValue(splatLoadingAtom);
  const stillLoading = isLoading || splatLoading;
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!stillLoading && visible) {
      setFadeOut(true);
      const timer = setTimeout(() => setVisible(false), 700);
      return () => clearTimeout(timer);
    }
  }, [stillLoading, visible]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Image
          src="/images/logo.svg"
          alt="Auki"
          width={40}
          height={64}
          priority
          className="w-[40px] h-[64px] mb-4 opacity-90"
        />
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Real World Web
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground font-medium">
          Loading domain&hellip;
        </p>
        <div className="mt-6 h-0.5 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full origin-left animate-pulse bg-primary/60 rounded-full" />
        </div>
      </div>
    </div>
  );
}

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
      <LoadingOverlay />
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
