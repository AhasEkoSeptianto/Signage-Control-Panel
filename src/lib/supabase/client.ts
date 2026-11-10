import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

/**
 * Creates a Supabase client for client-side components.
 * Cached in the browser to maintain a single instance.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  client = createBrowserClient<Database>(supabaseUrl, supabaseKey);
  return client;
}
