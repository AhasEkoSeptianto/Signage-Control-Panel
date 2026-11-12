/**
 * Supabase Database TypeScript Definitions
 * Schema konsisten:
 * - devices: id, nama, lokasi, status, last_seen
 * - contents: id, judul, tipe, payload, url, created_at
 */

export interface Database {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string;
          nama: string;
          lokasi: string;
          status: "online" | "offline" | "busy";
          last_seen: string;
        };
        Insert: {
          id: string;
          nama?: string | null;
          lokasi?: string | null;
          status?: "online" | "offline" | "busy";
          last_seen?: string;
        };
        Update: {
          id?: string;
          nama?: string | null;
          lokasi?: string | null;
          status?: "online" | "offline" | "busy";
          last_seen?: string;
        };
        Relationships: [];
      };
      contents: {
        Row: {
          id: string;
          judul: string;
          tipe: string;
          payload: string;
          url?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          judul: string;
          tipe?: string;
          payload: string;
          url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          judul?: string;
          tipe?: string;
          payload?: string;
          url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
