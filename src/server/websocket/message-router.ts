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
   * Handle Client Registration
   */
  private async handleAuthRegister(
    socket: WebSocket,
    message: WSMessage<AuthRegisterPayload>
  ): Promise<void> {
    const payload = message.payload;
    const expectedSecret = process.env.WS_AUTH_SECRET;

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

    this.manager.registerClient(socket, {
      id: clientId,
      role: payload.role,
      connectedAt: new Date().toISOString(),
      lastPing: new Date().toISOString(),
      deviceMeta: payload.deviceMeta,
    });

    this.manager.send(socket, {
      type: "AUTH_SUCCESS",
      payload: {
        clientId,
        role: payload.role,
        serverTime: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

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
    const targetDeviceId = message.targetId || "ALL";
    const command = message.payload.command;
    const args = message.payload.args as any;

    // Update state based on command
    if (command === "UPDATE_DEVICE_CONFIG" && args?.id && args?.lokasi) {
      await DeviceService.updateLocation(args.id, args.lokasi);
    }
    if ((command === "OPEN_URL" || command === "PLAY_MEDIA") && args?.title) {
      if (targetDeviceId !== "ALL" && targetDeviceId !== "BROADCAST") {
        await DeviceService.updateCurrentPlaying(targetDeviceId, args.title);
      }
    }

    const commandId = message.payload?.commandId || `cmd-${Date.now()}`;

    // Record command
    await DeviceService.recordCommand({
      id: commandId,
      device_id: targetDeviceId,
      command,
      payload: (args as any) || {},
      status: "sent",
    });

    // Forward to Electron client(s)
    const delivered = this.manager.sendToElectron(targetDeviceId, {
      type: "DESKTOP_COMMAND",
      payload: {
        ...message.payload,
        commandId,
      },
      targetId: targetDeviceId,
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

    await DeviceService.updateCommandResult(
      commandId,
      success ? "executed" : "failed",
      result,
      error
    );

    this.manager.broadcastToRole("web", {
      type: "DESKTOP_COMMAND_RESULT",
      payload: message.payload,
      senderId: message.senderId,
      correlationId: message.correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle telemetry status update sent from Electron
   */
  private async handleDeviceStatusUpdate(
    socket: WebSocket,
    message: WSMessage<DeviceStatusPayload>
  ): Promise<void> {
    const client = this.manager.getClient(socket);
    if (!client || client.info.role !== "electron") return;

    const payload = message.payload as any;
    const deviceId = payload?.deviceId || client.info.id;
    const currentPlaying = payload?.currentPlaying;

    if (currentPlaying) {
      DeviceService.updateCurrentPlaying(deviceId, currentPlaying);
    }

    // Relay to web dashboards
    this.manager.broadcastToRole("web", {
      type: "DEVICE_STATUS_UPDATE",
      payload: {
        deviceId,
        ...payload,
      },
      senderId: client.info.id,
      timestamp: new Date().toISOString(),
    });
  }
}
