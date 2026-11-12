/**
 * WebSocket Protocol Types for Next.js <-> Electron Communication
 */

export type ClientRole = "web" | "electron" | "server";

export interface ClientInfo {
  id: string;
  role: ClientRole;
  connectedAt: string;
  lastPing: string;
  // Electron-specific metadata
  deviceMeta?: {
    deviceName?: string;
    platform: string; // "win32" | "darwin" | "linux"
    arch?: string;
    appVersion?: string;
    osVersion?: string;
    managedDeviceIds?: string[];
    isSimulator?: boolean;
    hostname?: string;
  };
}

export type WSMessageType =
  // Authentication & Registration
  | "AUTH_REGISTER"
  | "AUTH_SUCCESS"
  | "AUTH_ERROR"

  // Heartbeat
  | "PING"
  | "PONG"

  // Device & Client Status
  | "CLIENT_JOINED"
  | "CLIENT_LEFT"
  | "CLIENT_LIST"
  | "DEVICE_STATUS_UPDATE"

  // Desktop Commands (Web -> Server -> Electron)
  | "DESKTOP_COMMAND"
  | "DESKTOP_COMMAND_ACK"
  | "DESKTOP_COMMAND_RESULT"

  // Supabase / Database Event Relay
  | "DB_SYNC_EVENT"

  // General Broadcast
  | "BROADCAST_MESSAGE";

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  senderId?: string;
  senderRole?: ClientRole;
  targetId?: string; // Target specific client id (e.g. specific Electron device)
  correlationId?: string; // For request-response matching
  timestamp: string;
}

// Payload payloads
export interface AuthRegisterPayload {
  role: ClientRole;
  secretToken?: string;
  deviceMeta?: {
    deviceName?: string;
    platform: string;
    arch?: string;
    appVersion?: string;
    osVersion?: string;
    managedDeviceIds?: string[];
    isSimulator?: boolean;
    hostname?: string;
  };
}

export interface DesktopCommandPayload {
  command:
    | "UPDATE_DEVICE_CONFIG"
    | "OPEN_URL"
    | "PLAY_MEDIA"
    | (string & {});
  args?: Record<string, unknown>;
  commandId?: string;
}

export interface DesktopCommandResultPayload {
  commandId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface DeviceStatusPayload {
  cpuUsage?: number;
  memoryUsage?: {
    usedMb: number;
    totalMb: number;
  };
  uptimeSeconds?: number;
  status: "idle" | "busy" | "offline";
}
