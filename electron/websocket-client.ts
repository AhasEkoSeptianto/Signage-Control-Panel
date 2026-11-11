/**
 * Reference Implementation for Electron Desktop Main Process
 *
 * Copy or adapt this file into your Electron app's `src/main/` or `main.js`.
 */

import { WebSocket } from "ws";
import { app, shell, Notification, ipcMain } from "electron";
import os from "os";

export interface ElectronWsConfig {
  serverUrl: string; // e.g. "ws://localhost:3000/ws" or "wss://your-domain.com/ws"
  secretToken: string;
  deviceId?: string;
  onCommand?: (command: { command: string; args?: any; commandId: string }) => void;
  onStatusChange?: (status: "connected" | "disconnected") => void;
}

export class ElectronWebSocketBridge {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private config: ElectronWsConfig;
  private deviceId: string;
  private managedDeviceIds: string[] = ["DEV-01", "DEV-02", "DEV-03", "DEV-04", "DEV-05", "DEV-06"];

  constructor(config: ElectronWsConfig) {
    this.config = config;
    this.deviceId =
      config.deviceId ||
      process.env.ELECTRON_DEVICE_ID ||
      "DEV-01";
  }

  public switchDeviceId(newDeviceId: string): void {
    console.log(`[Electron WS] Switching device identity to: ${newDeviceId}`);
    this.deviceId = newDeviceId;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.register();
    }
  }

  public setManagedDeviceIds(ids: string[]): void {
    console.log(`[Electron WS] Updating managed devices:`, ids);
    this.managedDeviceIds = ids;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.register();
    }
  }

  public connect(): void {
    if (this.isDestroyed) return;

    try {
      this.ws = new WebSocket(this.config.serverUrl);

      this.ws.on("open", () => {
        console.log("[Electron WS] Connected to hub server");
        this.config.onStatusChange?.("connected");
        this.register();
      });

      this.ws.on("message", (data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on("close", (code, reason) => {
        console.log(`[Electron WS] Disconnected (${code}). Retrying in 4s...`);
        this.config.onStatusChange?.("disconnected");
        this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        console.error("[Electron WS] Error:", err.message);
      });
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  private register(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: "AUTH_REGISTER",
        senderId: this.deviceId,
        payload: {
          role: "electron",
          secretToken: this.config.secretToken,
          deviceMeta: {
            deviceName: os.hostname(),
            platform: process.platform,
            arch: process.arch,
            appVersion: app.getVersion ? app.getVersion() : "1.0.0",
            osVersion: os.release(),
            managedDeviceIds: this.managedDeviceIds,
          },
        },
        timestamp: new Date().toISOString(),
      }),
    );
  }

  private async handleMessage(rawMessage: string): Promise<void> {
    try {
      const message = JSON.parse(rawMessage);

      if (message.type === "DESKTOP_COMMAND") {
        const { command, args, commandId } = message.payload;
        console.log(`[Electron WS] Executing Command: ${command}`);

        // Notify UI listener if registered
        this.config.onCommand?.(message.payload);

        let result: unknown = null;
        let success = true;
        let errorMessage: string | undefined;

        try {
          // Native Desktop Handler Switch
          switch (command) {
            case "OPEN_URL":
              if (args?.url && typeof args.url === "string") {
                await shell.openExternal(args.url);
                result = { opened: true, url: args.url };
              }
              break;

            case "NOTIFY":
              if (Notification.isSupported()) {
                new Notification({
                  title: (args?.title as string) || "Notifikasi Desktop",
                  body: (args?.body as string) || "",
                }).show();
                result = { shown: true };
              }
              break;

            case "GET_SYSTEM_INFO":
              result = {
                hostname: os.hostname(),
                platform: process.platform,
                totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
                freeMemMb: Math.round(os.freemem() / 1024 / 1024),
                uptime: process.uptime(),
              };
              break;

            default:
              result = { acknowledged: true, command };
          }
        } catch (execErr: any) {
          success = false;
          errorMessage = execErr?.message || "Execution failed";
        }

        // Send execution result back to the server
        this.send({
          type: "DESKTOP_COMMAND_RESULT",
          senderId: this.deviceId,
          targetId: message.senderId,
          correlationId: message.correlationId,
          payload: {
            commandId,
            success,
            result,
            error: errorMessage,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("[Electron WS] Failed to parse incoming message", err);
    }
  }

  public send(payload: Record<string, unknown>): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 4000);
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}
