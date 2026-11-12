import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface ContentRecord {
  id: string;
  judul: string;
  tipe: string;
  payload: string;
  url: string;
  created_at: string;
}

export class ContentService {
  /**
   * Fetch all contents directly from Supabase
   */
  static async getContents(): Promise<ContentRecord[]> {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.warn("[ContentService] Supabase client is not configured.");
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("contents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) {
        console.error("[ContentService] Error fetching contents from Supabase:", error);
        return [];
      }

      return data.map((c: any) => ({
        id: c.id,
        judul: c.judul || c.title || "Video Signage",
        tipe: c.tipe || c.type || "video",
        payload: c.payload || c.url || "",
        url: c.url || c.payload || "",
        created_at: c.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      console.error("[ContentService] Unexpected error fetching contents:", err);
      return [];
    }
  }

  /**
   * Insert a new content entry directly into Supabase
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

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase client is not configured or unavailable");
    }

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

    if (error) {
      console.error("[ContentService] Supabase insert error:", error);
      throw new Error(error.message);
    }

    return {
      id: data?.id || newRecord.id,
      judul: data?.judul || newRecord.judul,
      tipe: data?.tipe || newRecord.tipe,
      payload: data?.payload || newRecord.payload,
      url: data?.url || newRecord.url,
      created_at: data?.created_at || newRecord.created_at,
    };
  }

  /**
   * Update existing content in Supabase
   */
  static async updateContent(
    id: string,
    updates: {
      judul?: string;
      tipe?: string;
      payload?: string;
      url?: string;
    }
  ): Promise<ContentRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase client is not configured or unavailable");
    }

    const payloadUrl = updates.payload || updates.url;
    const updateObj: {
      judul?: string;
      tipe?: string;
      payload?: string;
      url?: string;
    } = {};

    if (updates.judul !== undefined) updateObj.judul = updates.judul;
    if (updates.tipe !== undefined) updateObj.tipe = updates.tipe;
    if (payloadUrl !== undefined) {
      updateObj.payload = payloadUrl;
      updateObj.url = payloadUrl;
    }

    try {
      const { data, error } = await supabase
        .from("contents")
        .update(updateObj)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[ContentService] Error updating content in Supabase:", error);
        throw new Error(error.message);
      }

      if (!data) return null;

      return {
        id: data.id,
        judul: data.judul || (data as any).title || "",
        tipe: data.tipe || (data as any).type || "video",
        payload: data.payload || data.url || "",
        url: data.url || data.payload || "",
        created_at: data.created_at || new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("[ContentService] Unexpected error updating content:", err);
      throw err;
    }
  }

  /**
   * Delete content by ID directly from Supabase
   */
  static async deleteContent(id: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from("contents").delete().eq("id", id);
      if (error) {
        console.error("[ContentService] Error deleting content from Supabase:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[ContentService] Unexpected error deleting content:", err);
      return false;
    }
  }
}
