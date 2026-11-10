import { NextResponse } from "next/server";
import { ConnectionManager } from "@/server/websocket/connection-manager";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export async function GET() {
  const manager = ConnectionManager.getInstance();
  const stats = manager.getStats();

  return NextResponse.json({
    status: "ok",
    serverTime: new Date().toISOString(),
    websocket: {
      totalClients: stats.total,
      electronClients: stats.electronCount,
      webClients: stats.webCount,
      connectedDeviceIds: stats.devices,
    },
    supabase: {
      configured: isSupabaseConfigured(),
    },
  });
}
