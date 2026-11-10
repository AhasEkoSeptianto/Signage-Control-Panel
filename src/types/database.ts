/**
 * Supabase Database TypeScript Definitions
 * Mirrors the schema in supabase/schema.sql
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
          device_name: string;
          platform: string;
          arch: string;
          app_version: string;
          status: "online" | "offline" | "busy";
          last_seen_at: string;
          created_at: string;
          metadata: Json;
        };
        Insert: {
          id: string;
          device_name: string;
          platform: string;
          arch?: string;
          app_version?: string;
          status?: "online" | "offline" | "busy";
          last_seen_at?: string;
          created_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          device_name?: string;
          platform?: string;
          arch?: string;
          app_version?: string;
          status?: "online" | "offline" | "busy";
          last_seen_at?: string;
          created_at?: string;
          metadata?: Json;
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
          result: Json | null;
          error_message: string | null;
          created_at: string;
          executed_at: string | null;
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
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          event_type: string;
          source: "web" | "electron" | "server";
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          source: "web" | "electron" | "server";
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          source?: "web" | "electron" | "server";
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type DeviceRow = Database["public"]["Tables"]["devices"]["Row"];
export type DesktopCommandRow = Database["public"]["Tables"]["desktop_commands"]["Row"];
export type ActivityLogRow = Database["public"]["Tables"]["activity_logs"]["Row"];
