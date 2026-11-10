import { WebSocket } from "ws";
import { ClientInfo, ClientRole, WSMessage } from "@/types/websocket";
import { DeviceService } from "@/services/device.service";

interface ConnectedClient {
  socket: WebSocket;
  info: ClientInfo;
  isAlive: boolean;
}

const GLOBAL_MANAGER_KEY = Symbol.for("mjs.ws.connection_manager");

export class ConnectionManager {
  private clients = new Map<WebSocket, ConnectedClient>();
  private electronByDeviceId = new Map<string, WebSocket>();

  private constructor() {}

  public static getInstance(): ConnectionManager {
    const globalStore = globalThis as unknown as { [GLOBAL_MANAGER_KEY]?: ConnectionManager };
    if (!globalStore[GLOBAL_MANAGER_KEY]) {
      globalStore[GLOBAL_MANAGER_KEY] = new ConnectionManager();
    }
    return globalStore[GLOBAL_MANAGER_KEY];
  }

  /**
   * Register a new or authenticated client
   */
  public registerClient(socket: WebSocket, info: ClientInfo): void {
    const existing = this.clients.get(socket);
    const clientData: ConnectedClient = {
      socket,
      info,
      isAlive: true,
    };

    this.clients.set(socket, clientData);

    if (info.role === "electron") {
      this.electronByDeviceId.set(info.id, socket);
      console.log(`[WS ConnectionManager] Electron registered: ${info.id} (${info.deviceMeta?.deviceName || "Unknown"})`);

      // Persist in Supabase
      if (info.deviceMeta) {
        DeviceService.registerOrUpdateDevice({
          id: info.id,
          device_name: info.deviceMeta.deviceName,
          platform: info.deviceMeta.platform,
          arch: info.deviceMeta.arch,
          app_version: info.deviceMeta.appVersion,
          status: "online",
          metadata: {
            osVersion: info.deviceMeta.osVersion,
            connectedAt: info.connectedAt,
          },
        });
      }
    } else {
      console.log(`[WS ConnectionManager] Web client connected: ${info.id}`);
    }

    // Broadcast updated client list to web clients
    this.broadcastClientList();
  }

  /**
   * Handle socket disconnection
   */
  public removeClient(socket: WebSocket): void {
    const client = this.clients.get(socket);
    if (!client) return;

    if (client.info.role === "electron") {
      this.electronByDeviceId.delete(client.info.id);
      console.log(`[WS ConnectionManager] Electron disconnected: ${client.info.id}`);

      // Update Supabase status
      DeviceService.updateDeviceStatus(client.info.id, "offline");

      // Notify web clients
      this.broadcastToRole("web", {
        type: "CLIENT_LEFT",
        payload: { clientId: client.info.id, role: "electron" },
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(`[WS ConnectionManager] Web client disconnected: ${client.info.id}`);
    }

    this.clients.delete(socket);
    this.broadcastClientList();
  }

  /**
   * Send a typed message to a specific socket
   */
  public send(socket: WebSocket, message: WSMessage): boolean {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Send a message to a specific Electron device by its ID
   */
  public sendToElectron(deviceId: string, message: WSMessage): boolean {
    const socket = this.electronByDeviceId.get(deviceId);
    if (!socket) {
      console.warn(`[WS ConnectionManager] Electron device ${deviceId} not found`);
      return false;
    }
    return this.send(socket, message);
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcastAll(message: WSMessage): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    });
  }

  /**
   * Broadcast message only to clients with a specific role
   */
  public broadcastToRole(role: ClientRole, message: WSMessage): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.info.role === role && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    });
  }

  /**
   * Broadcast current active client list to web dashboard
   */
  public broadcastClientList(): void {
    const list = this.getClientList();
    this.broadcastToRole("web", {
      type: "CLIENT_LIST",
      payload: list,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get list of all connected clients
   */
  public getClientList(): ClientInfo[] {
    const list: ClientInfo[] = [];
    this.clients.forEach((client) => {
      list.push(client.info);
    });
    return list;
  }

  /**
   * Get client info for a specific socket
   */
  public getClient(socket: WebSocket): ConnectedClient | undefined {
    return this.clients.get(socket);
  }

  /**
   * Heartbeat handling
   */
  public markAlive(socket: WebSocket): void {
    const client = this.clients.get(socket);
    if (client) {
      client.isAlive = true;
      client.info.lastPing = new Date().toISOString();
    }
  }

  public checkDeadConnections(): void {
    this.clients.forEach((client, socket) => {
      if (!client.isAlive) {
        console.log(`[WS ConnectionManager] Terminating unresponsive client: ${client.info.id}`);
        socket.terminate();
        this.removeClient(socket);
        return;
      }
      client.isAlive = false;
      try {
        socket.ping();
      } catch {
        socket.terminate();
        this.removeClient(socket);
      }
    });
  }

  /**
   * Get quick stats for diagnostics / REST API
   */
  public getStats() {
    let electronCount = 0;
    let webCount = 0;

    this.clients.forEach((client) => {
      if (client.info.role === "electron") electronCount++;
      else if (client.info.role === "web") webCount++;
    });

    return {
      total: this.clients.size,
      electronCount,
      webCount,
      devices: Array.from(this.electronByDeviceId.keys()),
    };
  }
}
