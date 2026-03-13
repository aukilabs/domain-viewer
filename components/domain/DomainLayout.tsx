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
      className={`absolute inset-0 z-[100] flex items-center justify-center transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-xl" />
      <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-[24px] px-10 py-10 flex flex-col items-center gap-5">
        <Image
          src="/images/logo.svg"
          alt="Auki"
          width={32}
          height={52}
          priority
          className="w-[32px] h-[52px] opacity-90"
        />
        <h1 className="text-lg font-medium text-white tracking-tight">
          Loading domain&hellip;
        </h1>
        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    </div>
  );
}

const DomainLayout = memo(function DomainLayout({
  hideUI,
  domainId,
  children,
}: DomainLayoutProps) {
  const isInIframe = useAtomValue(isInIframeAtom);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#050505]">
      {children}
      <Viewer3D isEmbed={isInIframe} />
      <DomainControls hideUI={hideUI} domainId={domainId} />
      <LoadingOverlay />
    </div>
  );
});

interface DomainLayoutProps {
  hideUI: boolean;
  domainId: string;
  children?: React.ReactNode;
}

export default DomainLayout;
