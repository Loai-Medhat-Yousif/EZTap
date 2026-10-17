import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

// Supabase Storage serves profile photos, so it's the one external
// origin images may load from. A project-specific origin is added when
// the URL is known at build time; the wildcard covers hosted projects.
const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : "";
  } catch {
    return "";
  }
})();

/**
 * Deliberately not a nonce-based "strict" CSP: Next.js and next-themes
 * inject inline scripts, so script-src has to allow 'unsafe-inline'
 * (and 'unsafe-eval' in dev for React's tooling). What this policy DOES
 * buy, regardless: nothing can frame the site (clickjacking on the
 * admin), no <object>/<embed>, no <base> hijacking, forms can only post
 * back to us, and images/connections are pinned to known origins.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.supabase.co ${supabaseOrigin}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co ${supabaseOrigin}${isProd ? "" : " ws: wss:"}`.trim(),
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Server Actions default to a 1MB request body, which silently caps
  // profile-image uploads far below the 5MB the bucket and the browser
  // compressor allow. Raise it just past MAX_FILE_SIZE_BYTES (5MB) so
  // the multipart boundary/header bytes fit too.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
