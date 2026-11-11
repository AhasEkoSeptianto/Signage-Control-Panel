"use strict";
/**
 * Reference Implementation for Electron Desktop Main Process
 *
 * Copy or adapt this file into your Electron app's `src/main/` or `main.js`.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronWebSocketBridge = void 0;
const ws_1 = require("ws");
const electron_1 = require("electron");
const os_1 = __importDefault(require("os"));
class ElectronWebSocketBridge {
    ws = null;
    reconnectTimer = null;
    isDestroyed = false;
    manualDisconnect = true;
    config;
    deviceId;
    managedDeviceIds = [];
    constructor(config) {
        this.config = config;
        this.deviceId =
            config.deviceId ||
                process.env.ELECTRON_DEVICE_ID ||
                "DEV-01";
    }
    get isConnected() {
        return !!this.ws && this.ws.readyState === ws_1.WebSocket.OPEN;
    }
    switchDeviceId(newDeviceId) {
        console.log(`[Electron WS] Switching device identity to: ${newDeviceId}`);
        this.deviceId = newDeviceId;
        if (this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.register();
        }
    }
    setManagedDeviceIds(ids) {
        console.log(`[Electron WS] Updating managed devices:`, ids);
        this.managedDeviceIds = ids;
        if (this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.register();
        }
    }
    connect() {
        if (this.isDestroyed)
            return;
        this.manualDisconnect = false;
        try {
            this.ws = new ws_1.WebSocket(this.config.serverUrl);
            this.ws.on("open", () => {
                console.log("[Electron WS] Connected to hub server");
                this.config.onStatusChange?.("connected");
                this.register();
            });
            this.ws.on("message", (data) => {
                this.handleMessage(data.toString());
            });
            this.ws.on("close", (code, reason) => {
                console.log(`[Electron WS] Disconnected (${code}).`);
                this.config.onStatusChange?.("disconnected");
                if (!this.manualDisconnect && !this.isDestroyed) {
                    this.scheduleReconnect();
                }
            });
            this.ws.on("error", (err) => {
                console.error("[Electron WS] Error:", err.message);
            });
        }
        catch (err) {
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
            }
            catch { }
            this.ws = null;
        }
        this.config.onStatusChange?.("disconnected");
    }
    register() {
        if (!this.ws || this.ws.readyState !== ws_1.WebSocket.OPEN)
            return;
        this.ws.send(JSON.stringify({
            type: "AUTH_REGISTER",
            senderId: this.deviceId,
            payload: {
                role: "electron",
                secretToken: this.config.secretToken,
                deviceMeta: {
                    deviceName: os_1.default.hostname(),
                    platform: process.platform,
                    arch: process.arch,
                    appVersion: electron_1.app.getVersion ? electron_1.app.getVersion() : "1.0.0",
                    osVersion: os_1.default.release(),
                    managedDeviceIds: this.managedDeviceIds,
                },
            },
            timestamp: new Date().toISOString(),
        }));
    }
    async handleMessage(rawMessage) {
        try {
            const message = JSON.parse(rawMessage);
            if (message.type === "DESKTOP_COMMAND") {
                const { command, args, commandId } = message.payload;
                console.log(`[Electron WS] Executing Command: ${command}`);
                // Notify UI listener if registered
                this.config.onCommand?.(message.payload);
                let result = null;
                let success = true;
                let errorMessage;
                try {
                    // Native Desktop Handler Switch
                    switch (command) {
                        case "OPEN_URL":
                            if (args?.url && typeof args.url === "string") {
                                await electron_1.shell.openExternal(args.url);
                                result = { opened: true, url: args.url };
                            }
                            break;
                        case "NOTIFY":
                            if (electron_1.Notification.isSupported()) {
                                new electron_1.Notification({
                                    title: args?.title || "Notifikasi Desktop",
                                    body: args?.body || "",
                                }).show();
                                result = { shown: true };
                            }
                            break;
                        case "GET_SYSTEM_INFO":
                            result = {
                                hostname: os_1.default.hostname(),
                                platform: process.platform,
                                totalMemMb: Math.round(os_1.default.totalmem() / 1024 / 1024),
                                freeMemMb: Math.round(os_1.default.freemem() / 1024 / 1024),
                                uptime: process.uptime(),
                            };
                            break;
                        default:
                            result = { acknowledged: true, command };
                    }
                }
                catch (execErr) {
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
        }
        catch (err) {
            console.error("[Electron WS] Failed to parse incoming message", err);
        }
    }
    send(payload) {
        if (this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
            return true;
        }
        return false;
    }
    scheduleReconnect() {
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 4000);
    }
    destroy() {
        this.isDestroyed = true;
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        if (this.ws)
            this.ws.close();
    }
}
exports.ElectronWebSocketBridge = ElectronWebSocketBridge;
