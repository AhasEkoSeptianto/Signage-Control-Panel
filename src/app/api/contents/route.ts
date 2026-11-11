import { NextRequest, NextResponse } from "next/server";
import { ContentService } from "@/services/content.service";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();
  const contents = await ContentService.getContents();

  return NextResponse.json({
    status: "ok",
    supabaseConfigured: configured,
    count: contents.length,
    contents,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { judul, tipe, payload, url, title, type } = body;

    const contentJudul = judul || title;
    const contentPayload = payload || url;

    if (!contentJudul || !contentPayload) {
      return NextResponse.json(
        { error: "Parameter 'judul' dan 'payload' (URL) wajib diisi." },
        { status: 400 }
      );
    }

    const created = await ContentService.createContent({
      judul: contentJudul,
      tipe: tipe || type || "video",
      payload: contentPayload,
      url: contentPayload,
    });

    return NextResponse.json({
      status: "ok",
      content: created,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create content" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Parameter 'id' wajib diisi." }, { status: 400 });
    }

    const deleted = await ContentService.deleteContent(id);
    return NextResponse.json({ status: deleted ? "ok" : "not_found" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete content" }, { status: 500 });
  }
}
