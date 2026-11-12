import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/is-configured";
import { ConnectionManager } from "@/server/websocket/connection-manager";
import { RealtimeChannel } from "@supabase/supabase-js";

let realtimeChannel: RealtimeChannel | null = null;

export class RealtimeHubService {
  public static init() {
    if (!isSupabaseAdminConfigured()) {
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }

    // Mendengarkan perubahan tabel devices secara realtime
    realtimeChannel = supabase
      .channel("mjs-devices-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "devices",
        },
        async (payload) => {
          const manager = ConnectionManager.getInstance();
          // Broadcast perubahan perangkat ke semua dashboard web
          manager.broadcastToRole("web", {
            type: "DB_SYNC_EVENT",
            payload: {
              table: "devices",
              eventType: payload.eventType,
              record: payload.new || payload.old,
            },
            timestamp: new Date().toISOString(),
          });
        }
      )
      .subscribe();
  }

  public static stop() {
    if (realtimeChannel) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        supabase.removeChannel(realtimeChannel);
      }
      realtimeChannel = null;
    }
  }
}
