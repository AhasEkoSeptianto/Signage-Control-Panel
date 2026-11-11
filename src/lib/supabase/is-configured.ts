/**
 * Helper to determine if Supabase environment variables are properly configured.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;
  if (url.includes("placeholder-project") || anonKey.includes("placeholder")) return false;

  return true;
}

export function isSupabaseAdminConfigured(): boolean {
  if (!isSupabaseConfigured()) return false;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !serviceKey ||
    serviceKey.includes("placeholder") ||
    serviceKey === "postgres" ||
    serviceKey.length < 20
  ) {
    return false;
  }
  return true;
}
