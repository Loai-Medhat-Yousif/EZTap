"use client";

import { useEffect, useState } from "react";

/**
 * Seconds remaining until `expiresAt`, formatted for human readability:
 * - When > 1 day: "Xd Yh"
 * - When > 1 hour: "Xh Ym"
 * - Under 1 hour: "m:ss"
 * Refreshes once a second. Returns null when there is no expiry.
 */
export function useCountdown(expiresAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return null;

  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now);
  const totalSeconds = Math.floor(remainingMs / 1000);

  if (totalSeconds <= 0) return "0:00";

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
