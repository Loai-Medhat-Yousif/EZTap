/**
 * Locale configuration.
 *
 * EZTab intentionally does NOT use path-based locale routing
 * (e.g. /en/card/123, /ar/card/123). Card URLs are printed on physical
 * NFC/QR hardware and must stay exactly `/card/{cardId}` forever, so the
 * active locale lives in a cookie instead of the URL. Every request
 * resolves its locale the same way, whether it hits an admin route or a
 * public card route.
 */

export const locales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeDirections: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

export const localeCookieName = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
