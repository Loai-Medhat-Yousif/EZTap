/**
 * Builds a WhatsApp chat link (`https://wa.me/{digits}`) from whatever
 * the admin pastes in: a local number with spaces/dashes, an
 * international number with `+` or a leading `00`, or an existing
 * wa.me link.
 *
 * Client-safe on purpose — no network call, no server round trip; the
 * same helper powers the Tools page and the inline helper in the link
 * form (profiles and stores alike).
 */

/** WhatsApp requires the full international number in E.164 form with
 * no `+`, no leading zero and no spaces — max 15 digits. */
const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

export type WhatsappLinkResult =
  | { url: string; error?: never }
  | { url?: never; error: "empty" | "invalid" };

export function buildWhatsappLink(rawInput: string): WhatsappLinkResult {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) return { error: "empty" };

  // Reuse the digits of an existing wa.me / api.whatsapp.com link if
  // that's what got pasted.
  const existing = /(?:wa\.me|api\.whatsapp\.com\/send(?:\?phone=)?)\/?(\d+)/i.exec(
    trimmed,
  );
  let digits = (existing?.[1] ?? trimmed).replace(/\D/g, "");

  // `00` is the international dialing prefix; wa.me doesn't want it.
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
    return { error: "invalid" };
  }

  return { url: `https://wa.me/${digits}` };
}
