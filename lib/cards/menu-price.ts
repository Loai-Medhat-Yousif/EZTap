/**
 * Menu prices are stored as plain numbers (the admin/customer enters just
 * the amount). The currency is always displayed as EGP, in Arabic, so it is
 * appended at render time instead of being duplicated in every stored row.
 */
export const MENU_CURRENCY = "ح.م";

/** Returns `null` for empty values; otherwise appends the currency suffix. */
export function formatMenuPrice(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  // Older rows may already contain a written amount such as "120 EGP".
  // Leave those untouched instead of producing "120 EGP ح.م".
  if (/[A-Za-z\u0600-\u06FF]/.test(trimmed)) return trimmed;

  return `${trimmed}\u00A0${MENU_CURRENCY}`;
}
