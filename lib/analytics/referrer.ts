/**
 * Reduces a referrer to its origin ("https://www.instagram.com"),
 * dropping path and query. A full referrer URL can carry a search
 * query, an account name, or a token — none of which analytics needs
 * (spec section 32: don't collect unnecessary personal information).
 */
export function referrerOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}
