"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { StatusScreen } from "@/components/shared/status-screen";
import { Button } from "@/components/ui/button";

/** Shared body for app/error.tsx and app/admin/error.tsx. Shows only
 * Next's opaque `digest` (a hash that lets us find the real error in
 * the server logs) — never the message or stack. */
export function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen title={t("title")} message={t("message")}>
      <Button type="button" className="mt-6" onClick={reset}>
        {t("retry")}
      </Button>
      {error.digest && (
        <p className="mt-4 font-mono text-[11px] text-muted">
          {t("reference")}: {error.digest}
        </p>
      )}
    </StatusScreen>
  );
}
