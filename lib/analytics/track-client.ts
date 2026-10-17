"use client";

export type TrackableEvent =
  | { type: "LINK_CLICK"; linkId: string }
  | { type: "PHONE_CLICK" }
  | { type: "WHATSAPP_CLICK" }
  | { type: "EMAIL_CLICK" }
  | { type: "WEBSITE_CLICK" }
  | { type: "MAPS_CLICK" }
  | { type: "SHARE_CLICK" }
  | { type: "SAVE_CONTACT_CLICK" };

/**
 * Records a click-type interaction without blocking or delaying the
 * outbound navigation it's attached to.
 *
 * Posts to our own same-origin /api/track (validated and rate limited
 * server-side) rather than calling Supabase from the browser, so no
 * database credential or RPC is exposed to visitors for this at all.
 * `keepalive: true` lets the request survive the page navigating away
 * right after the click, which a plain fetch does not reliably do.
 */
export function trackCardEvent(cardId: string, event: TrackableEvent) {
  const body = JSON.stringify({
    cardId,
    ...event,
    referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
  });

  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Fire-and-forget beacon — a dropped event isn't worth surfacing
      // to the visitor or retrying.
    });
  } catch {
    // Same reasoning; some environments can throw synchronously here.
  }
}
