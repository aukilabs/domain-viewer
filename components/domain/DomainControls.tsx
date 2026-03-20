"use client";

import React, { memo } from "react";
import { useAtomValue } from "jotai";
import { isInIframeAtom } from "@/store/domainStore";
import { ToggleVisibility } from "@/components/ToggleVisibility";
import Navbar from "@/components/Navbar";
import DomainInfo from "@/components/DomainInfo";
import DomainShare from "@/components/DomainShare";

const DomainControls = memo(function DomainControls({
  hideUI,
  domainId,
}: DomainControlsProps) {
  const isInIframe = useAtomValue(isInIframeAtom);

  if (hideUI || isInIframe) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-end justify-center gap-3 px-4 sm:px-6">
        <ToggleVisibility />
        <Navbar currentDomainId={domainId} />
        <DomainInfo />
        <DomainShare />
      </div>
    </div>
  );
});

interface DomainControlsProps {
  hideUI: boolean;
  domainId: string;
}

export default DomainControls;
