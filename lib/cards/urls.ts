import type { Card } from "@/types";

/**
 * The stable public URL for a card, built from NEXT_PUBLIC_APP_URL.
 * This is the one URL the app owns and can route through: the card's
 * *content* (profile fields, links, or the Google Review target) lives
 * in the database behind it, never in the URL itself.
 */
export function getCardProfileUrl(cardId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${base}/card/${cardId}`;
}

/**
 * What the physical card's NFC tag/QR actually encodes: always the
 * stable `/card/{cardId}` URL above, for every card type.
 *
 * Deliberately type-independent, and deliberately not the raw
 * destination. The QR/NFC is printed on hardware and can't be changed
 * afterwards, so it must encode a value that never changes. An earlier
 * version pointed a GOOGLE_REVIEW card's tag straight at the Google
 * URL, which meant editing the review link — or a future change of
 * target — silently invalidated every already-printed card. Routing
 * every card through `/card/{cardId}` instead lets `/card/[cardId]`
 * render the profile for a PROFILE card and redirect to
 * `google_review_url` for a GOOGLE_REVIEW card, so the destination can
 * change as often as needed without reprinting a thing.
 */
export function getCardDestinationUrl(card: Pick<Card, "card_id">): string {
  return getCardProfileUrl(card.card_id);
}

/**
 * The temporary, customer-facing URL that opens a card's edit session.
 * The token is the whole credential — it is never stored raw, only its
 * hash (see lib/cards/edit-links.ts) — so this URL is the only place the
 * raw value ever appears.
 */
export function getCardEditUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${base}/edit/${token}`;
}
