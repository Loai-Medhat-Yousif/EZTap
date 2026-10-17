import "server-only";

/**
 * Turns a Google Maps link (or a bare place ID) into a direct
 * "write a review" URL.
 *
 * Why this needs any work at all: a Google Maps share link
 * (`https://maps.app.goo.gl/...`) redirects to a `/maps/place/...` URL
 * whose only stable identifier is the Feature ID — `1s0x…:0x…` — not
 * the `ChIJ…` place ID that the review endpoint wants. Google's place
 * IDs are a documented, reversible encoding of exactly that pair: 20
 * bytes of protobuf (`0A 12 09` header, then each 64-bit half of the
 * Feature ID as a little-endian fixed64 — the first preceded by a `09`
 * tag, the second by an `11` tag), base64url-encoded. So the pair can be converted locally, with no API
 * key and no HTML scraping (the Maps page is JS-rendered and never
 * exposes the place ID in its initial HTML anyway).
 */

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 8000;

const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);

// `ChIJ` + 23 base64url chars is the canonical 27-char place ID length.
const PLACE_ID_RE = /ChIJ[A-Za-z0-9_-]{23}/;
const FEATURE_ID_RE = /1s0x([0-9a-fA-F]+):0x([0-9a-fA-F]+)/;

/** Only Google hosts are ever fetched or accepted — an admin pasting any
 * other URL must not turn this action into an SSRF primitive. */
function isAllowedGoogleHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (SHORT_LINK_HOSTS.has(host)) return true;
  if (host === "google.com" || host.endsWith(".google.com")) return true;
  // Country domains: google.co.uk, google.com.eg, google.de, …
  return /^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2,3})?$/.test(host);
}

/** `1s0x<hi>:0x<lo>` → the 27-char `ChIJ…` place ID. */
function featureIdToPlaceId(hiHex: string, loHex: string): string {
  const bytes = Buffer.alloc(20);
  bytes[0] = 0x0a; // field 1, LEN
  bytes[1] = 0x12; // length 18
  bytes[2] = 0x09; // fixed64 tag
  bytes.writeBigUInt64LE(BigInt(`0x${hiHex}`), 3);
  bytes[11] = 0x11; // fixed64 tag (second half — differs from the first `09`)
  bytes.writeBigUInt64LE(BigInt(`0x${loHex}`), 12);
  return bytes.toString("base64url");
}

function extractPlaceId(text: string): string | null {
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    // Malformed percent-encoding — fall back to the raw string.
  }

  const placeMatch = decoded.match(PLACE_ID_RE);
  if (placeMatch) return placeMatch[0];

  const featureMatch = decoded.match(FEATURE_ID_RE);
  if (featureMatch) return featureIdToPlaceId(featureMatch[1], featureMatch[2]);

  return null;
}

function reviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/** Follows redirects (short links only) to the expanded Maps URL. */
async function resolveFinalUrl(startUrl: string): Promise<string | null> {
  let current = startUrl;

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "Mozilla/5.0 (compatible; EZTab/1.0)" },
      });

      const location = res.headers.get("location");
      if (!location) return current;

      const next = new URL(location, current);
      if (!isAllowedGoogleHost(next.hostname)) return current;
      current = next.toString();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return current;
}

export type ReviewLinkResult = { url?: string; error?: string };

export async function generateReviewLink(
  rawInput: string,
): Promise<ReviewLinkResult> {
  const input = rawInput.trim();
  if (!input) return { error: "Paste a Google Maps link or place ID." };

  // A bare `ChIJ…` place ID pasted straight in.
  if (PLACE_ID_RE.test(input) && !input.includes("/")) {
    return { url: reviewUrl(input.match(PLACE_ID_RE)![0]) };
  }

  if (!/^https?:\/\//i.test(input)) {
    // Maybe a bare `1s0x…:0x…` pair.
    const placeId = extractPlaceId(input);
    if (placeId) return { url: reviewUrl(placeId) };
    return { error: "That doesn't look like a Google Maps link." };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { error: "That doesn't look like a valid URL." };
  }

  if (!isAllowedGoogleHost(url.hostname)) {
    return { error: "Only Google Maps links are supported." };
  }

  const isShortLink = SHORT_LINK_HOSTS.has(url.hostname.toLowerCase());
  let placeId = extractPlaceId(url.toString());

  // Expand short links (which never carry a Feature ID) or, when a link
  // has neither a place ID nor a Feature ID, follow it in case a
  // redirect reveals one.
  if (isShortLink || !placeId) {
    const resolved = await resolveFinalUrl(url.toString());
    if (resolved) placeId = extractPlaceId(resolved) ?? placeId;
  }

  if (!placeId) {
    return {
      error:
        "Couldn't find the place in that link. Open the place in Google Maps, tap Share, then paste the full link.",
    };
  }

  return { url: reviewUrl(placeId) };
}
