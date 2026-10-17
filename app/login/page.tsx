import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-primary-tint via-background to-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-8 shadow-sm animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* The logo's "Tab" wordmark is near-black, so it needs a
              light backing chip to stay legible in dark mode — the
              chip color is intentionally NOT theme-driven. */}
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#15171F] p-3 shadow-sm ring-1 ring-black/5">
            <Image
              src="/brand/logo.svg"
              alt="EZTab"
              width={56}
              height={38}
              priority
            />
          </div>
          <h1 className="text-lg font-semibold text-ink">
            {t("loginTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("loginSubtitle")}</p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
