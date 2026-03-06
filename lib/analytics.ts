import * as amplitude from "@amplitude/analytics-browser";
import { getOrCreatePosemeshClientId } from "./posemeshClient";

type ViewContext =
  | "twitter_embed"
  | "twitter_browser"
  | "slack_unfurl"
  | "linkedin_embed"
  | "direct"
  | "other";

let initialized = false;
let cachedViewContext: ViewContext | null = null;
let cachedReferrerDomain: string | null = null;

function parseReferrerDomain(referrer: string): string {
  try {
    return new URL(referrer).hostname;
  } catch {
    return "";
  }
}

export function getViewContext(): ViewContext {
  if (cachedViewContext) return cachedViewContext;

  const referrer = document.referrer;
  const domain = parseReferrerDomain(referrer);
  const isEmbedded = window.self !== window.top;

  cachedReferrerDomain = domain;

  if (domain.includes("t.co") || domain.includes("x.com") || domain.includes("twitter.com")) {
    cachedViewContext = isEmbedded ? "twitter_embed" : "twitter_browser";
  } else if (domain.includes("slack.com")) {
    cachedViewContext = "slack_unfurl";
  } else if (domain.includes("linkedin.com")) {
    cachedViewContext = isEmbedded ? "linkedin_embed" : "other";
  } else if (!referrer) {
    cachedViewContext = "direct";
  } else {
    cachedViewContext = "other";
  }

  return cachedViewContext;
}

export function getReferrerDomain(): string {
  if (cachedReferrerDomain !== null) return cachedReferrerDomain;
  cachedReferrerDomain = parseReferrerDomain(document.referrer);
  return cachedReferrerDomain;
}

export function getUtmSource(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("utm_source");
}

export function initAnalytics() {
  if (initialized) return;

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) {
    console.warn("[Analytics] NEXT_PUBLIC_AMPLITUDE_API_KEY not set, skipping init");
    return;
  }

  amplitude.init(apiKey, {
    autocapture: false,
  });

  amplitude.setUserId(getOrCreatePosemeshClientId());

  initialized = true;
}

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (!initialized) return;

  amplitude.track(name, {
    ...properties,
    view_context: getViewContext(),
    referrer_domain: getReferrerDomain(),
  });
}
