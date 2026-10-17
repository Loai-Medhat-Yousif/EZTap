import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEventSchema } from "@/lib/validation/track";
import { getClientIp } from "@/lib/security/client-ip";
import { hashIdentifier, rateLimit } from "@/lib/security/rate-limit";
import { getDeviceCategoryFromUserAgent } from "@/lib/analytics/parse-user-agent";
import { referrerOrigin } from "@/lib/analytics/referrer";

// Public by design — visitors are anonymous — so it is the *only* way
// click events reach the database, and it is validated and rate limited.
// (record_analytics_event is no longer callable with the public anon
// key; see the security-hardening migration.)
const MAX_BODY_BYTES = 2048;
const REQUESTS_PER_MINUTE = 60;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const parsed = trackEventSchema.safeParse(json);
  if (!parsed.success) {
    return new NextResponse(null, { status: 400 });
  }
  const event = parsed.data;

  const ip = getClientIp(request.headers);
  const allowed = await rateLimit(
    `track:${hashIdentifier(ip)}`,
    REQUESTS_PER_MINUTE,
    60,
  );
  if (!allowed) {
    return new NextResponse(null, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { error } = await createAdminClient().rpc("record_analytics_event", {
    p_card_id: event.cardId,
    p_event_type: event.type,
    p_profile_link_id: event.type === "LINK_CLICK" ? event.linkId : null,
    p_device_category: getDeviceCategoryFromUserAgent(
      request.headers.get("user-agent"),
    ),
    p_referrer: referrerOrigin(event.referrer),
  });

  // Whatever happened, the visitor's click already went through; a
  // failed analytics write is logged for us, never surfaced to them.
  if (error) console.error("[track] record_analytics_event failed:", error.message);

  return new NextResponse(null, { status: 204 });
}
