"use server";

import { ConnectionManager } from "@/server/websocket/connection-manager";
import { DeviceService } from "@/services/device.service";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DesktopCommandPayload } from "@/types/websocket";

/**
 * Server Action: Mengirim perintah ke Electron Desktop dari Server Component / Form Action
 */
export async function sendCommandServerAction(
  deviceId: string,
  command: DesktopCommandPayload["command"],
  args?: Record<string, unknown>
) {
  if (!deviceId || !command) {
    return { success: false, error: "DeviceId dan command wajib diisi." };
  }

  const manager = ConnectionManager.getInstance();
  const commandId = `sa-cmd-${Date.now()}`;

  // Catat ke Supabase
  await DeviceService.recordCommand({
    id: commandId,
    device_id: deviceId,
    command,
    payload: (args as any) || {},
    status: "sent",
  });

  // Kirim via WebSocket
  const delivered = manager.sendToElectron(deviceId, {
    type: "DESKTOP_COMMAND",
    payload: {
      command,
      args,
      commandId,
    },
    senderRole: "server",
    timestamp: new Date().toISOString(),
  });

  if (!delivered) {
    return {
      success: false,
      commandId,
      error: `Perangkat '${deviceId}' tidak terhubung saat ini.`,
    };
  }

  return {
    success: true,
    commandId,
    message: `Perintah '${command}' berhasil dikirim ke '${deviceId}'.`,
  };
}

/**
 * Server Action: Mendapatkan daftar perangkat aktif yang tersambung saat ini
 */
export async function getActiveDevicesAction() {
  const manager = ConnectionManager.getInstance();
  return manager.getClientList().filter((c) => c.role === "electron");
}

/**
 * Server Action: Mengambil riwayat perintah dari Supabase
 */
export async function getCommandHistoryAction(deviceId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase
    .from("desktop_commands")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (deviceId) {
    query = query.eq("device_id", deviceId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[DeviceActions] Error fetching history:", error.message);
    return [];
  }

  return data;
}
