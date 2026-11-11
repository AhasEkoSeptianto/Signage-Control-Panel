const { WebSocket } = require("ws");
const { app } = require("electron");
const os = require("os");

class ElectronWebSocketBridge {
  constructor(config) {
    this.ws = null;
    this.reconnectTimer = null;
    this.isDestroyed = false;
    this.manualDisconnect = true;
    this.config = config;
    this.deviceId =
      config.deviceId ||
      process.env.ELECTRON_DEVICE_ID ||
      "DEV-01";
    this.managedDeviceIds = [];
  }

  get isConnected() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  switchDeviceId(newDeviceId) {
    console.log(`[Electron WS] Switching device identity to: ${newDeviceId}`);
    this.deviceId = newDeviceId;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.register();
    }
  }

  setManagedDeviceIds(ids) {
    console.log(`[Electron WS] Updating managed devices:`, ids);
    this.managedDeviceIds = ids;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.register();
    }
  }

  connect() {
    if (this.isDestroyed) return;
    this.manualDisconnect = false;

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

      this.ws.on("close", (code) => {
        console.log(`[Electron WS] Disconnected (${code}).`);
        this.config.onStatusChange?.("disconnected");
        if (!this.manualDisconnect && !this.isDestroyed) {
          this.scheduleReconnect();
        }
      });

      this.ws.on("error", (err) => {
        console.error("[Electron WS] Error:", err.message);
      });
    } catch (err) {
      if (!this.manualDisconnect && !this.isDestroyed) {
        this.scheduleReconnect();
      }
    }
  }

  disconnect() {
    console.log("[Electron WS] Manual disconnect requested");
    this.manualDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.config.onStatusChange?.("disconnected");
  }

  register() {
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
      })
    );
  }

  async handleMessage(rawMessage) {
    try {
      const message = JSON.parse(rawMessage);

      if (message.type === "DESKTOP_COMMAND") {
        const { command, commandId } = message.payload;
        console.log(`[Electron WS] Executing Command: ${command}`);

        // Notify UI listener in renderer (signage screen plays media directly)
        this.config.onCommand?.(message.payload);

        // Send execution result back to the server
        this.send({
          type: "DESKTOP_COMMAND_RESULT",
          senderId: this.deviceId,
          targetId: message.senderId,
          correlationId: message.correlationId,
          payload: {
            commandId,
            success: true,
            result: { acknowledged: true, command },
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("[Electron WS] Failed to parse incoming message", err);
    }
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 4000);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}

module.exports = { ElectronWebSocketBridge };
