/**
 * Deliberately coarse — spec section 32 treats device/browser/OS as
 * optional, non-essential metadata ("if it can be done responsibly").
 * A full UA-parsing library is more precision than the analytics UI
 * actually needs, so this is the one heuristic the app uses; browser
 * and OS are left null rather than guessed at.
 */
export function getDeviceCategoryFromUserAgent(
  userAgent: string | null,
): "mobile" | "desktop" | null {
  if (!userAgent) return null;
  return /Mobi|Android|iPhone|iPad/i.test(userAgent) ? "mobile" : "desktop";
}
