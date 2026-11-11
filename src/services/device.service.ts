import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Database } from "@/types/database";

export interface DeviceRecord {
  id: string;
  lokasi: string;
  status: "online" | "offline" | "busy";
  last_seen: string;
  current_playing?: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

type CommandInsert = Database["public"]["Tables"]["desktop_commands"]["Insert"];
type DeviceInsert = Database["public"]["Tables"]["devices"]["Insert"];

export class DeviceService {
  /**
   * Fetch all registered fleet devices directly from Supabase
   */
  static async getDevices(): Promise<DeviceRecord[]> {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.warn("[DeviceService] Supabase client is not configured.");
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("id", { ascending: true });

      if (error || !data) {
        console.error("[DeviceService] Error fetching devices from Supabase:", error);
        return [];
      }

      return data.map((d: any) => ({
        id: d.id,
        lokasi: d.lokasi || d.location || "Gedung Utama",
        status: (d.status as any) || "offline",
        last_seen: d.last_seen || new Date().toISOString(),
        current_playing: d.current_playing || "Idle / Standby",
        created_at: d.created_at || new Date().toISOString(),
        metadata: d.metadata || {},
      }));
    } catch (err) {
      console.error("[DeviceService] Unexpected error fetching devices:", err);
      return [];
    }
  }

  /**
   * Upsert a device when it connects, is added, or updated by admin into Supabase
   */
  static async registerOrUpdateDevice(deviceData: {
    id: string;
    lokasi?: string;
    status?: "online" | "offline" | "busy";
    current_playing?: string;
    metadata?: Record<string, unknown>;
  }): Promise<DeviceRecord> {
    const now = new Date().toISOString();
    const lokasi = deviceData.lokasi || "Gedung Utama";

    const record: DeviceRecord = {
      id: deviceData.id,
      lokasi,
      status: deviceData.status || "online",
      last_seen: now,
      current_playing: deviceData.current_playing || "Idle / Standby",
      created_at: now,
      metadata: deviceData.metadata || {},
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const updatePayload: DeviceInsert = {
          id: record.id,
          lokasi: record.lokasi,
          status: record.status,
          last_seen: record.last_seen,
          current_playing: record.current_playing,
          metadata: record.metadata as any,
        };

        await supabase
          .from("devices")
          .upsert(updatePayload, { onConflict: "id" });
      } catch (err) {
        console.error("[DeviceService] Supabase upsert error:", err);
      }
    }

    return record;
  }

  /**
   * Update device location in Supabase
   */
  static async updateLocation(deviceId: string, lokasi: string) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("devices").update({ lokasi }).eq("id", deviceId);
      } catch (err) {
        console.error("[DeviceService] Error updating location in Supabase:", err);
      }
    }
  }

  /**
   * Update currently playing media title in Supabase in real-time
   */
  static async updateCurrentPlaying(deviceId: string, currentPlaying: string) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from("devices")
          .update({
            current_playing: currentPlaying,
            last_seen: new Date().toISOString(),
          })
          .eq("id", deviceId);
      } catch (err) {
        console.error("[DeviceService] Error updating current_playing in Supabase:", err);
      }
    }
  }

  /**
   * Mark a device status (e.g. online, offline, busy) in Supabase
   */
  static async updateDeviceStatus(deviceId: string, status: "online" | "offline" | "busy") {
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from("devices")
          .update({
            status,
            last_seen: now,
          })
          .eq("id", deviceId);
      } catch (err) {
        console.error("[DeviceService] Error updating device status in Supabase:", err);
      }
    }
  }

  /**
   * Delete device from Supabase
   */
  static async deleteDevice(deviceId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { error } = await supabase.from("devices").delete().eq("id", deviceId);
        return !error;
      } catch (err) {
        console.error("[DeviceService] Error deleting device in Supabase:", err);
      }
    }
    return false;
  }

  /**
   * Log a command dispatched to an Electron client in Supabase
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
        console.warn("[DeviceService] Error recording command in Supabase:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error("[DeviceService] Unexpected error recording command:", err);
      return null;
    }
  }

  /**
   * Update the execution result of a command in Supabase
   */
  static async updateCommandResult(
    commandId: string,
    status: "executed" | "failed",
    result?: unknown,
    errorMessage?: string
  ) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      await supabase
        .from("desktop_commands")
        .update({
          status,
          result: (result as any) || null,
          error_message: errorMessage || null,
          executed_at: new Date().toISOString(),
        })
        .eq("id", commandId);
    } catch (err) {
      console.error("[DeviceService] Unexpected error updating command status:", err);
    }
  }
}
