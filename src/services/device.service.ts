import fs from "fs";
import path from "path";
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

const DATA_FILE = path.join(process.cwd(), "data", "devices.json");

function readLocalDevices(): DeviceRecord[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[DeviceService] Error reading local devices.json:", err);
    return [];
  }
}

function writeLocalDevices(devices: DeviceRecord[]) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(devices, null, 2), "utf-8");
  } catch (err) {
    console.error("[DeviceService] Error writing local devices.json:", err);
  }
}

export class DeviceService {
  /**
   * Fetch all registered fleet devices (local persistent fallback + Supabase)
   */
  static async getDevices(): Promise<DeviceRecord[]> {
    const localList = readLocalDevices();
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return localList;
    }

    try {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("id", { ascending: true });

      if (error || !data || data.length === 0) {
        return localList;
      }

      // Merge Supabase with local devices
      const seenIds = new Set(data.map((d: any) => d.id));
      const combined: DeviceRecord[] = data.map((d: any) => ({
        id: d.id,
        lokasi: d.lokasi || d.location || "Gedung Utama",
        status: (d.status as any) || "offline",
        last_seen: d.last_seen || new Date().toISOString(),
        current_playing: d.current_playing || "Idle / Standby",
        created_at: d.created_at || new Date().toISOString(),
        metadata: d.metadata || {},
      }));

      for (const item of localList) {
        if (!seenIds.has(item.id)) {
          combined.push(item);
        }
      }

      return combined;
    } catch (err) {
      console.error("[DeviceService] Unexpected error fetching devices:", err);
      return localList;
    }
  }

  /**
   * Upsert a device when it connects, is added, or updated by admin
   * Maps solely: id, lokasi, status, last_seen, current_playing (NO nama node)
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

    // 1. Save to local storage
    const local = readLocalDevices();
    const existingIndex = local.findIndex((d) => d.id === deviceData.id);

    const record: DeviceRecord = {
      id: deviceData.id,
      lokasi: deviceData.lokasi !== undefined ? lokasi : (local[existingIndex]?.lokasi || lokasi),
      status: deviceData.status || (local[existingIndex]?.status || "online"),
      last_seen: now,
      current_playing: deviceData.current_playing || (local[existingIndex]?.current_playing || "Idle / Standby"),
      created_at: local[existingIndex]?.created_at || now,
      metadata: deviceData.metadata || local[existingIndex]?.metadata || {},
    };

    if (existingIndex >= 0) {
      local[existingIndex] = record;
    } else {
      local.push(record);
    }
    writeLocalDevices(local);

    // 2. Save to Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from("devices")
          .upsert(
            {
              id: record.id,
              lokasi: record.lokasi,
              status: record.status,
              last_seen: record.last_seen,
              current_playing: record.current_playing,
              metadata: record.metadata as any,
            },
            { onConflict: "id" }
          );
      } catch (err) {
        console.warn("[DeviceService] Supabase upsert error, saved locally:", err);
      }
    }

    return record;
  }

  /**
   * Update device location specifically
   */
  static async updateLocation(deviceId: string, lokasi: string) {
    const local = readLocalDevices();
    const d = local.find((x) => x.id === deviceId);
    if (d) {
      d.lokasi = lokasi;
      writeLocalDevices(local);
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("devices").update({ lokasi }).eq("id", deviceId);
      } catch {}
    }
  }

  /**
   * Update currently playing media title in real-time
   */
  static async updateCurrentPlaying(deviceId: string, currentPlaying: string) {
    const local = readLocalDevices();
    const d = local.find((x) => x.id === deviceId);
    if (d) {
      d.current_playing = currentPlaying;
      d.last_seen = new Date().toISOString();
      writeLocalDevices(local);
    }

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
      } catch {}
    }
  }

  /**
   * Mark a device status (e.g. online, offline, busy)
   */
  static async updateDeviceStatus(deviceId: string, status: "online" | "offline" | "busy") {
    const now = new Date().toISOString();

    const local = readLocalDevices();
    const d = local.find((x) => x.id === deviceId);
    if (d) {
      d.status = status;
      d.last_seen = now;
      writeLocalDevices(local);
    }

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
      } catch {}
    }
  }

  /**
   * Delete device from local and Supabase
   */
  static async deleteDevice(deviceId: string): Promise<boolean> {
    const local = readLocalDevices();
    const filtered = local.filter((d) => d.id !== deviceId);
    writeLocalDevices(filtered);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("devices").delete().eq("id", deviceId);
      } catch {}
    }

    return true;
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
   * Update the execution result of a command
   */
  static async updateCommandStatus(
    commandId: string,
    status: "executed" | "failed",
    result?: unknown,
    errorMessage?: string
  ) {
    return this.updateCommandResult(commandId, status, result, errorMessage);
  }

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

  /**
   * Activity logger
   */
  static async logActivity(eventType: string, source: string, details?: unknown) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      await (supabase as any).from("activity_logs").insert({
        event_type: eventType,
        source,
        details: details || {},
        created_at: new Date().toISOString(),
      });
    } catch {}
  }
}
