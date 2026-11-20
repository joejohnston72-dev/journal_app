/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Missing = local-only mode (nothing leaves the phone). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (anon) key. Safe in the browser; RLS protects rows. Never the service key. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

/** Build id shown in Settings (git sha in CI, "dev" locally). */
declare const __APP_VERSION__: string;
