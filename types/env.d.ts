declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_SUPABASE_URL: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    readonly SUPABASE_SERVICE_ROLE_KEY: string;
    readonly NEXT_PUBLIC_APP_URL: string;
    /** Optional — lib/auth/admin-email.ts falls back to "eztab.internal". */
    readonly ADMIN_EMAIL_DOMAIN?: string;
  }
}
