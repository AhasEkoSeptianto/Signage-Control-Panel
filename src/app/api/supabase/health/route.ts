import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return NextResponse.json({
      status: "unconfigured",
      message: "Supabase credentials are placeholder values or missing in .env.local",
      configured: false,
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      status: "error",
      message: "Supabase admin client could not be initialized",
      configured: false,
    });
  }

  try {
    // Test connectivity by counting devices
    const { data, error, count } = await supabase
      .from("devices")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({
        status: "table_not_found_or_error",
        message: error.message,
        hint: "Pastikan script supabase/schema.sql telah dijalankan di dashboard Supabase.",
        configured: true,
      });
    }

    return NextResponse.json({
      status: "connected",
      message: "Supabase database connection successful!",
      deviceCount: count || 0,
      configured: true,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "connection_failed",
      error: err.message,
      configured: true,
    });
  }
}
