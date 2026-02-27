import { useCallback } from "react";
import { trackEvent, getViewContext, getReferrerDomain, getUtmSource } from "@/lib/analytics";

export function useAnalytics() {
  const trackPageViewed = useCallback((path: string, domainId?: string) => {
    trackEvent("page_viewed", {
      path,
      domain_id: domainId ?? null,
    });
  }, []);

  const trackSessionStarted = useCallback((entryPage: string) => {
    trackEvent("session_started", {
      entry_page: entryPage,
      referrer: document.referrer,
      view_context: getViewContext(),
      utm_source: getUtmSource(),
    });
  }, []);

  const trackDomainSearchInitiated = useCallback((domainId: string, source: "navbar") => {
    trackEvent("domain_search_initiated", {
      domain_id: domainId,
      source,
    });
  }, []);

  const trackDomainLoaded = useCallback(
    (props: {
      domain_id: string;
      load_time_ms: number;
      has_splat: boolean;
      has_nav_mesh: boolean;
      has_occlusion_mesh: boolean;
      portal_count: number;
      point_count: number;
    }) => {
      trackEvent("domain_loaded", props);
    },
    []
  );

  const trackDomainLoadFailed = useCallback(
    (domainId: string, errorType: "not_found" | "network" | "access_denied" | "unknown") => {
      trackEvent("domain_load_failed", {
        domain_id: domainId,
        error_type: errorType,
      });
    },
    []
  );

  const trackViewerInteractionStarted = useCallback(
    (domainId: string, mode: "map" | "fps") => {
      trackEvent("viewer_interaction_started", {
        domain_id: domainId,
        mode,
      });
    },
    []
  );

  const trackCameraModeSwitched = useCallback(
    (domainId: string, fromMode: "map" | "fps", toMode: "map" | "fps") => {
      trackEvent("camera_mode_switched", {
        domain_id: domainId,
        from_mode: fromMode,
        to_mode: toMode,
      });
    },
    []
  );

  const trackLayerToggled = useCallback(
    (domainId: string, layer: string, visible: boolean) => {
      trackEvent("layer_toggled", {
        domain_id: domainId,
        layer,
        visible,
      });
    },
    []
  );

  const trackFieldCopied = useCallback((domainId: string, field: string) => {
    trackEvent("field_copied", {
      domain_id: domainId,
      field,
    });
  }, []);

  const trackPreviewViewed = useCallback((domainId: string) => {
    trackEvent("preview_viewed", {
      domain_id: domainId,
      referrer: document.referrer,
      referrer_domain: getReferrerDomain(),
      is_embedded: window.self !== window.top,
      view_context: getViewContext(),
      utm_source: getUtmSource(),
    });
  }, []);

  return {
    trackPageViewed,
    trackSessionStarted,
    trackDomainSearchInitiated,
    trackDomainLoaded,
    trackDomainLoadFailed,
    trackViewerInteractionStarted,
    trackCameraModeSwitched,
    trackLayerToggled,
    trackFieldCopied,
    trackPreviewViewed,
  };
}
