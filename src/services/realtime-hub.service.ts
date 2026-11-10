import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/is-configured";
import { ConnectionManager } from "@/server/websocket/connection-manager";
import { DesktopCommandPayload } from "@/types/websocket";
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

    realtimeChannel = supabase
      .channel("mjs-db-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "desktop_commands",
        },
        async (payload) => {
          const newRow = payload.new as any;
          if (!newRow || newRow.status !== "pending") return;

          const manager = ConnectionManager.getInstance();
          const targetDeviceId = newRow.device_id;

          const delivered = manager.sendToElectron(targetDeviceId, {
            type: "DESKTOP_COMMAND",
            payload: {
              command: newRow.command as DesktopCommandPayload["command"],
              args: newRow.payload,
              commandId: newRow.id,
            },
            senderRole: "server",
            timestamp: new Date().toISOString(),
          });

          await supabase
            .from("desktop_commands")
            .update({
              status: delivered ? "sent" : "failed",
              error_message: delivered ? null : "Perangkat tidak terhubung saat perintah dijadwalkan.",
            })
            .eq("id", newRow.id);
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
