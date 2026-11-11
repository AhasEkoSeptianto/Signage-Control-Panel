import fs from "fs";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface ContentRecord {
  id: string;
  judul: string;
  tipe: string;
  payload: string;
  url: string;
  created_at: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "contents.json");

function readLocalContents(): ContentRecord[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn("[ContentService] Error reading local contents.json:", err);
    return [];
  }
}

function writeLocalContents(contents: ContentRecord[]) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(contents, null, 2), "utf-8");
  } catch (err) {
    console.error("[ContentService] Error writing local contents.json:", err);
  }
}

export class ContentService {
  /**
   * Fetch all contents (Supabase + local persistent fallback)
   */
  static async getContents(): Promise<ContentRecord[]> {
    const localList = readLocalContents();
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return localList;
    }

    try {
      const { data, error } = await supabase
        .from("contents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return localList;
      }

      // Merge Supabase and local contents, avoiding duplicates
      const seenIds = new Set(data.map((d: any) => d.id));
      const combined = [...data.map((c: any) => ({
        id: c.id,
        judul: c.judul || c.title || "Video Signage",
        tipe: c.tipe || c.type || "video",
        payload: c.payload || c.url || "",
        url: c.url || c.payload || "",
        created_at: c.created_at || new Date().toISOString(),
      }))];

      for (const item of localList) {
        if (!seenIds.has(item.id)) {
          combined.push(item);
        }
      }

      return combined;
    } catch (err) {
      console.error("[ContentService] Unexpected error fetching contents:", err);
      return localList;
    }
  }

  /**
   * Insert a new content entry into local store and Supabase
   */
  static async createContent(content: {
    judul: string;
    tipe: string;
    payload: string;
    url?: string;
  }): Promise<ContentRecord> {
    const payloadUrl = content.payload || content.url || "";
    const newRecord: ContentRecord = {
      id: `content-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      judul: content.judul,
      tipe: content.tipe || "video",
      payload: payloadUrl,
      url: payloadUrl,
      created_at: new Date().toISOString(),
    };

    // 1. Always persist to local file immediately
    const local = readLocalContents();
    local.unshift(newRecord);
    writeLocalContents(local);

    // 2. Also attempt persistence to Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("contents")
          .insert({
            id: newRecord.id,
            judul: newRecord.judul,
            tipe: newRecord.tipe,
            payload: newRecord.payload,
            url: newRecord.url,
            created_at: newRecord.created_at,
          })
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            judul: data.judul || newRecord.judul,
            tipe: data.tipe || newRecord.tipe,
            payload: data.payload || newRecord.payload,
            url: data.url || newRecord.url,
            created_at: data.created_at || newRecord.created_at,
          };
        }
      } catch (err) {
        console.warn("[ContentService] Supabase insert failed, local copy saved:", err);
      }
    }

    return newRecord;
  }

  /**
   * Delete content by ID from both local store and Supabase
   */
  static async deleteContent(id: string): Promise<boolean> {
    // 1. Remove from local store
    const local = readLocalContents();
    const filtered = local.filter((item) => item.id !== id);
    writeLocalContents(filtered);

    // 2. Remove from Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from("contents").delete().eq("id", id);
      } catch (err) {
        console.warn("[ContentService] Supabase delete warning:", err);
      }
    }

    return true;
  }
}
