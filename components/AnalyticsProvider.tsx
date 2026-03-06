"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics } from "@/lib/analytics";
import { useAnalytics } from "@/hooks/useAnalytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { trackPageViewed, trackSessionStarted } = useAnalytics();
  const initializedRef = useRef(false);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const alreadyStarted = sessionStorage.getItem("analytics_session_started");
      if (!alreadyStarted) {
        sessionStorage.setItem("analytics_session_started", "1");
        trackSessionStarted(pathname);
      }
    }

    const domainId = extractDomainId(pathname);
    trackPageViewed(pathname, domainId);
  }, [pathname, trackPageViewed, trackSessionStarted]);

  return <>{children}</>;
}

function extractDomainId(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 1 && segments[0] !== "preview") {
    return segments[0];
  }
  return undefined;
}
