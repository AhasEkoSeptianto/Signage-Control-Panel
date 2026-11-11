import { NextRequest, NextResponse } from "next/server";
import { ConnectionManager } from "@/server/websocket/connection-manager";
import { DeviceService } from "@/services/device.service";
import { DesktopCommandPayload } from "@/types/websocket";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId, command, args } = body;

    if (!deviceId || !command) {
      return NextResponse.json(
        { error: "Parameter 'deviceId' dan 'command' wajib diisi." },
        { status: 400 }
      );
    }

    const manager = ConnectionManager.getInstance();
    const commandId = `api-cmd-${Date.now()}`;

    // Record in Supabase
    await DeviceService.recordCommand({
      id: commandId,
      device_id: deviceId,
      command,
      payload: args || {},
      status: "sent",
    });

    // Send to Electron
    const delivered = manager.sendToElectron(deviceId, {
      type: "DESKTOP_COMMAND",
      payload: {
        command: command as DesktopCommandPayload["command"],
        args,
        commandId,
      },
      senderRole: "web",
      timestamp: new Date().toISOString(),
    });

    if (!delivered) {
      return NextResponse.json(
        {
          error: `Perangkat Electron '${deviceId}' tidak terhubung ke WebSocket server saat ini.`,
          commandId,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Perintah '${command}' berhasil dikirim ke perangkat '${deviceId}'.`,
      commandId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
