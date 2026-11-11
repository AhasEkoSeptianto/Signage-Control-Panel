import { NextRequest, NextResponse } from "next/server";
import { DeviceService } from "@/services/device.service";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();
  const devices = await DeviceService.getDevices();

  return NextResponse.json({
    status: "ok",
    supabaseConfigured: configured,
    count: devices.length,
    devices,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, lokasi, status, current_playing, location } = body;

    if (!id) {
      return NextResponse.json({ error: "Parameter 'id' wajib diisi." }, { status: 400 });
    }

    const device = await DeviceService.registerOrUpdateDevice({
      id,
      lokasi: lokasi || location || "Gedung Utama",
      status: status || "online",
      current_playing,
    });

    return NextResponse.json({
      status: "ok",
      device,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upsert device" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Parameter 'id' wajib diisi." }, { status: 400 });
    }

    await DeviceService.deleteDevice(id);
    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete device" }, { status: 500 });
  }
}
