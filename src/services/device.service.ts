import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Database } from "@/types/database";

type DeviceInsert = Database["public"]["Tables"]["devices"]["Insert"];
type CommandInsert = Database["public"]["Tables"]["desktop_commands"]["Insert"];

export class DeviceService {
  /**
   * Upsert a device when it connects or reports status
   */
  static async registerOrUpdateDevice(deviceData: DeviceInsert) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      // Supabase is not configured yet, silently pass in development mode
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("devices")
        .upsert(
          {
            ...deviceData,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (error) {
        console.error("[DeviceService] Error registering device in Supabase:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error("[DeviceService] Unexpected error:", err);
      return null;
    }
  }

  /**
   * Mark a device status (e.g. offline)
   */
  static async updateDeviceStatus(deviceId: string, status: "online" | "offline" | "busy") {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const { error } = await supabase
        .from("devices")
        .update({
          status,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", deviceId);

      if (error) {
        console.error("[DeviceService] Error updating device status:", error.message);
      }
    } catch (err) {
      console.error("[DeviceService] Failed to update device status:", err);
    }
  }

  /**
   * Log a command dispatched to an Electron client
   */
  static async recordCommand(commandData: CommandInsert) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from("desktop_commands")
        .insert(commandData)
        .select()
        .single();

      if (error) {
        console.error("[DeviceService] Error logging command:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error("[DeviceService] Failed to record command:", err);
      return null;
    }
  }

  /**
   * Update command execution status/result
   */
  static async updateCommandResult(
    commandId: string,
    status: "executed" | "failed",
    result: unknown,
    errorMessage?: string
  ) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const { error } = await supabase
        .from("desktop_commands")
        .update({
          status,
          result: (result as any) || null,
          error_message: errorMessage || null,
          executed_at: new Date().toISOString(),
        })
        .eq("id", commandId);

      if (error) {
        console.error("[DeviceService] Error updating command result:", error.message);
      }
    } catch (err) {
      console.error("[DeviceService] Failed to update command result:", err);
    }
  }

  /**
   * Log real-time activity event
   */
  static async logActivity(eventType: string, source: "web" | "electron" | "server", details: Record<string, unknown>) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      await supabase.from("activity_logs").insert({
        event_type: eventType,
        source,
        details: details as any,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Non-blocking log failure
    }
  }
}
