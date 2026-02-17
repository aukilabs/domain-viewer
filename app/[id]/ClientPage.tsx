"use client";

import DomainLoader from "@/components/domain/DomainLoader";
import DomainLayout from "@/components/domain/DomainLayout";

export const maxDuration = 60;

/**
 * Main domain viewer page component that orchestrates the loading and display of domain data.
 * This component serves as a thin composition layer, delegating data loading to DomainLoader
 * and layout rendering to DomainLayout.
 * 
 * @param props - Component props
 * @param props.params - Next.js route parameters
 * @param props.params.id - The domain ID from the URL
 * @param props.hideUI - Optional flag to hide UI controls (defaults to false)
 */
export default function DomainPage({ params, hideUI = false }: { params: { id: string }, hideUI?: boolean }) {
  return (
    <>
      <DomainLoader domainId={params.id} />
      <DomainLayout hideUI={hideUI} domainId={params.id} />
    </>
  );
}
