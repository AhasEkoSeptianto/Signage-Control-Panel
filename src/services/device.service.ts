import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Database } from "@/types/database";

export interface DeviceRecord {
  id: string;
  nama: string;
  lokasi: string;
  status: "online" | "offline" | "busy";
  last_seen: string;
}

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
        nama: d.nama || d.name || `Display ${d.id}`,
        lokasi: d.lokasi || d.location || "Gedung Utama",
        status: (d.status as any) || "offline",
        last_seen: d.last_seen || new Date().toISOString(),
      }));
    } catch (err) {
      console.error("[DeviceService] Unexpected error fetching devices:", err);
      return [];
    }
  }

  /**
   * Find a specific registered device by ID (case-insensitive)
   */
  static async getDeviceById(id: string): Promise<DeviceRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase || !id) return null;

    try {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .ilike("id", id.trim())
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      const row: any = data;
      return {
        id: row.id,
        nama: row.nama || row.name || `Display ${row.id}`,
        lokasi: row.lokasi || row.location || "Gedung Utama",
        status: (row.status as any) || "offline",
        last_seen: row.last_seen || new Date().toISOString(),
      };
    } catch (err) {
      console.error("[DeviceService] Unexpected error finding device by ID:", err);
      return null;
    }
  }

  /**
   * Upsert a device when it connects, is added, or updated by admin into Supabase
   */
  static async registerOrUpdateDevice(deviceData: {
    id: string;
    nama?: string;
    lokasi?: string;
    status?: "online" | "offline" | "busy";
  }): Promise<DeviceRecord> {
    const now = new Date().toISOString();
    const nama = deviceData.nama || `Display ${deviceData.id}`;
    const lokasi = deviceData.lokasi || "Gedung Utama";

    const record: DeviceRecord = {
      id: deviceData.id,
      nama,
      lokasi,
      status: deviceData.status || "online",
      last_seen: now,
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const updatePayload: DeviceInsert = {
          id: record.id,
          nama: record.nama,
          lokasi: record.lokasi,
          status: record.status,
          last_seen: record.last_seen,
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
        await supabase
          .from("devices")
          .update({
            lokasi,
            last_seen: new Date().toISOString(),
          })
          .eq("id", deviceId);
      } catch (err) {
        console.error("[DeviceService] Error updating location in Supabase:", err);
      }
    }
  }

  /**
   * Update device name in Supabase
   */
  static async updateDeviceName(deviceId: string, nama: string) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from("devices")
          .update({
            nama,
            last_seen: new Date().toISOString(),
          })
          .eq("id", deviceId);
      } catch (err) {
        console.error("[DeviceService] Error updating name in Supabase:", err);
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
}
