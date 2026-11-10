import { WebSocket } from "ws";
import {
  AuthRegisterPayload,
  DesktopCommandPayload,
  DesktopCommandResultPayload,
  DeviceStatusPayload,
  WSMessage,
} from "@/types/websocket";
import { ConnectionManager } from "./connection-manager";
import { DeviceService } from "@/services/device.service";

const GLOBAL_ROUTER_KEY = Symbol.for("mjs.ws.message_router");

export class MessageRouter {
  private manager: ConnectionManager;

  private constructor() {
    this.manager = ConnectionManager.getInstance();
  }

  public static getInstance(): MessageRouter {
    const globalStore = globalThis as unknown as { [GLOBAL_ROUTER_KEY]?: MessageRouter };
    if (!globalStore[GLOBAL_ROUTER_KEY]) {
      globalStore[GLOBAL_ROUTER_KEY] = new MessageRouter();
    }
    return globalStore[GLOBAL_ROUTER_KEY];
  }

  /**
   * Main incoming message handler
   */
  public async handleMessage(socket: WebSocket, rawData: string): Promise<void> {
    try {
      const message: WSMessage = JSON.parse(rawData);
      const currentClient = this.manager.getClient(socket);

      switch (message.type) {
        case "AUTH_REGISTER":
          await this.handleAuthRegister(socket, message as WSMessage<AuthRegisterPayload>);
          break;

        case "PING":
          this.manager.markAlive(socket);
          this.manager.send(socket, {
            type: "PONG",
            payload: { timestamp: new Date().toISOString() },
            timestamp: new Date().toISOString(),
          });
          break;

        case "PONG":
          this.manager.markAlive(socket);
          break;

        case "DESKTOP_COMMAND":
          await this.handleDesktopCommand(socket, message as WSMessage<DesktopCommandPayload>);
          break;

        case "DESKTOP_COMMAND_RESULT":
          await this.handleDesktopCommandResult(message as WSMessage<DesktopCommandResultPayload>);
          break;

        case "DEVICE_STATUS_UPDATE":
          await this.handleDeviceStatusUpdate(socket, message as WSMessage<DeviceStatusPayload>);
          break;

        case "BROADCAST_MESSAGE":
          // Broadcast to all web dashboards
          this.manager.broadcastToRole("web", message);
          break;

        default:
          console.warn(`[WS Router] Unknown message type: ${(message as any).type}`);
      }
    } catch (err) {
      console.error("[WS Router] Error parsing/processing message:", err);
    }
  }

  /**
   * Handle Client Registration (Electron handshake or Web dashboard join)
   */
  private async handleAuthRegister(
    socket: WebSocket,
    message: WSMessage<AuthRegisterPayload>
  ): Promise<void> {
    const payload = message.payload;
    const expectedSecret = process.env.WS_AUTH_SECRET;

    // Validate Electron clients if secret token is configured
    if (payload.role === "electron") {
      if (expectedSecret && payload.secretToken !== expectedSecret) {
        console.warn("[WS Router] Electron client failed authentication: invalid secret token");
        this.manager.send(socket, {
          type: "AUTH_ERROR",
          payload: { message: "Invalid authentication token." },
          timestamp: new Date().toISOString(),
        });
        socket.close(4001, "Unauthorized");
        return;
      }
    }

    const clientId = message.senderId || (payload.role === "electron" ? `electron-${Date.now()}` : `web-${Date.now()}`);

    // Register in ConnectionManager
    this.manager.registerClient(socket, {
      id: clientId,
      role: payload.role,
      connectedAt: new Date().toISOString(),
      lastPing: new Date().toISOString(),
      deviceMeta: payload.deviceMeta,
    });

    // Send ACK to client
    this.manager.send(socket, {
      type: "AUTH_SUCCESS",
      payload: {
        clientId,
        role: payload.role,
        serverTime: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    // Log to Supabase
    DeviceService.logActivity("client_registered", payload.role, {
      clientId,
      meta: payload.deviceMeta,
    });
  }

  /**
   * Route command from Web Dashboard to target Electron desktop client
   */
  private async handleDesktopCommand(
    socket: WebSocket,
    message: WSMessage<DesktopCommandPayload>
  ): Promise<void> {
    const targetDeviceId = message.targetId;

    if (!targetDeviceId) {
      this.manager.send(socket, {
        type: "DESKTOP_COMMAND_ACK",
        payload: { success: false, error: "Missing targetId (device ID)" },
        correlationId: message.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const commandId = message.payload?.commandId || `cmd-${Date.now()}`;

    // Record command in Supabase
    await DeviceService.recordCommand({
      id: commandId,
      device_id: targetDeviceId,
      command: message.payload.command,
      payload: (message.payload.args as any) || {},
      status: "sent",
    });

    // Forward to Electron client
    const delivered = this.manager.sendToElectron(targetDeviceId, {
      type: "DESKTOP_COMMAND",
      payload: {
        ...message.payload,
        commandId,
      },
      senderId: message.senderId,
      senderRole: "web",
      correlationId: message.correlationId,
      timestamp: new Date().toISOString(),
    });

    // Send ACK back to the web client
    this.manager.send(socket, {
      type: "DESKTOP_COMMAND_ACK",
      payload: {
        commandId,
        success: delivered,
        error: delivered ? undefined : "Device is not currently connected.",
      },
      correlationId: message.correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle result returned from Electron Desktop client
   */
  private async handleDesktopCommandResult(
    message: WSMessage<DesktopCommandResultPayload>
  ): Promise<void> {
    const { commandId, success, result, error } = message.payload;

    console.log(`[WS Router] Received command result for ${commandId}: success=${success}`);

    // Update in Supabase
    await DeviceService.updateCommandResult(
      commandId,
      success ? "executed" : "failed",
      result,
      error
    );

    // Broadcast result to all web dashboards
    this.manager.broadcastToRole("web", {
      type: "DESKTOP_COMMAND_RESULT",
      payload: message.payload,
      senderId: message.senderId,
      correlationId: message.correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle telemetry status update sent from Electron (e.g. CPU, RAM, uptime)
   */
  private async handleDeviceStatusUpdate(
    socket: WebSocket,
    message: WSMessage<DeviceStatusPayload>
  ): Promise<void> {
    const client = this.manager.getClient(socket);
    if (!client || client.info.role !== "electron") return;

    // Relay to web dashboards
    this.manager.broadcastToRole("web", {
      type: "DEVICE_STATUS_UPDATE",
      payload: {
        deviceId: client.info.id,
        ...message.payload,
      },
      senderId: client.info.id,
      timestamp: new Date().toISOString(),
    });
  }
}
