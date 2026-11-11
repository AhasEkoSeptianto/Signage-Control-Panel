/**
 * Supabase Database TypeScript Definitions
 * Mirrors the updated schema in supabase/schema.sql
 *
 * Tables:
 * - devices: id, lokasi, status, last_seen, current_playing, created_at, metadata
 * - contents: id, judul, tipe, payload/url, created_at
 * - desktop_commands: id, device_id, command, payload, status, result, error_message, created_at, executed_at
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string;
          lokasi: string;
          status: "online" | "offline" | "busy";
          last_seen: string;
          current_playing?: string | null;
          created_at?: string | null;
          metadata?: Json;
        };
        Insert: {
          id: string;
          lokasi?: string | null;
          status?: "online" | "offline" | "busy";
          last_seen?: string;
          current_playing?: string | null;
          created_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          lokasi?: string | null;
          status?: "online" | "offline" | "busy";
          last_seen?: string;
          current_playing?: string | null;
          created_at?: string;
          metadata?: Json;
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
          title?: string | null;
          type?: string | null;
        };
        Insert: {
          id?: string;
          judul: string;
          tipe?: string;
          payload: string;
          url?: string | null;
          created_at?: string;
          title?: string | null;
          type?: string | null;
        };
        Update: {
          id?: string;
          judul?: string;
          tipe?: string;
          payload?: string;
          url?: string | null;
          created_at?: string;
          title?: string | null;
          type?: string | null;
        };
        Relationships: [];
      };
      desktop_commands: {
        Row: {
          id: string;
          device_id: string;
          command: string;
          payload: Json;
          status: "pending" | "sent" | "executed" | "failed";
          result?: Json | null;
          error_message?: string | null;
          created_at: string;
          executed_at?: string | null;
        };
        Insert: {
          id?: string;
          device_id: string;
          command: string;
          payload?: Json;
          status?: "pending" | "sent" | "executed" | "failed";
          result?: Json | null;
          error_message?: string | null;
          created_at?: string;
          executed_at?: string | null;
        };
        Update: {
          id?: string;
          device_id?: string;
          command?: string;
          payload?: Json;
          status?: "pending" | "sent" | "executed" | "failed";
          result?: Json | null;
          error_message?: string | null;
          created_at?: string;
          executed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "desktop_commands_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "devices";
            referencedColumns: ["id"];
          },
        ];
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
