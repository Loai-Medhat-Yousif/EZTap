/** Exactly six digits, no leading zero — mirrors the cards.card_id CHECK. */
export function isValidCardId(value: string): boolean {
  return /^[1-9][0-9]{5}$/.test(value);
}
