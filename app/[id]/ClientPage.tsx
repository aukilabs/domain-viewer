"use client";

import { useEffect } from "react";
import DomainLoader from "@/components/domain/DomainLoader";
import DomainLayout from "@/components/domain/DomainLayout";
import { useAnalytics } from "@/hooks/useAnalytics";

export const maxDuration = 60;

export default function DomainPage({ params, hideUI = false }: { params: { id: string }, hideUI?: boolean }) {
  const { trackPreviewViewed } = useAnalytics();

  useEffect(() => {
    if (hideUI) {
      trackPreviewViewed(params.id);
    }
  }, [hideUI, params.id, trackPreviewViewed]);

  return (
    <>
      <DomainLoader domainId={params.id} />
      <DomainLayout hideUI={hideUI} domainId={params.id} />
    </>
  );
}
