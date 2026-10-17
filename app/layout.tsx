import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { localeDirections, type Locale } from "@/lib/i18n/config";
import { Ubuntu } from "next/font/google";
import "./globals.css";

const ubuntu = Ubuntu({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ubuntu",
});

// One type family across both scripts (IBM Plex) instead of pairing an
// unrelated Latin face with an unrelated Arabic face — keeps the brand
// voice consistent when the UI switches language. IBM Plex Mono is used
// for the 6-digit card IDs, which read like device/serial codes.
export const metadata: Metadata = {
  title: {
    default: "EZTab",
    template: "%s | EZTab",
  },
  description: "EZTab — tap-to-share digital business cards.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = localeDirections[locale];

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={ubuntu.variable}>
      <body
        className="font-sans antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <Toaster
              richColors
              position={dir === "rtl" ? "top-left" : "top-right"}
            />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
