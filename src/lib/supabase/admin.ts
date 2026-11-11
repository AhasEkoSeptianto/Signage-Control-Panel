import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { isSupabaseConfigured, isSupabaseAdminConfigured } from "./is-configured";

let clientInstance: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Creates or retrieves a Supabase client.
 * Uses the Service Role Key when properly configured to bypass RLS,
 * or falls back to the Anon Key for client/read access.
 */
export function getSupabaseAdmin() {
  if (clientInstance) return clientInstance;

  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  if (isSupabaseAdminConfigured()) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    clientInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return clientInstance;
  }

  // Fallback to anon key if service role key is not yet set
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  clientInstance = createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return clientInstance;
}
