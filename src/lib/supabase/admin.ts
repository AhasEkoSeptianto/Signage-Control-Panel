import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { isSupabaseAdminConfigured } from "./is-configured";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Creates or retrieves a Supabase Admin client with the Service Role Key.
 * Bypasses Row Level Security (RLS).
 * MUST ONLY be called server-side (Node.js/WebSocket server).
 */
export function getSupabaseAdmin() {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
