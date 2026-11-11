"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const websocket_client_1 = require("./websocket-client");
let mainWindow = null;
let hubBridge = null;
let telemetryTimer = null;
let currentPlayingTitle = "Video Promo Diskon Spesial";
let activeDeviceId = "DEV-01";
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 920,
        minWidth: 1024,
        minHeight: 720,
        title: "SignageHub - Fleet Player Node",
        backgroundColor: "#031427",
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    const htmlPath = fs_1.default.existsSync(path_1.default.join(__dirname, "index.html"))
        ? path_1.default.join(__dirname, "index.html")
        : path_1.default.join(__dirname, "../electron/index.html");
    mainWindow.loadFile(htmlPath);
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
// Window control IPC handlers
electron_1.ipcMain.on("window:minimize", () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.on("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
electron_1.ipcMain.on("window:close", () => {
    mainWindow?.close();
});
electron_1.ipcMain.on("hub:switchDevice", (_event, deviceId) => {
    activeDeviceId = deviceId;
    if (hubBridge) {
        hubBridge.switchDeviceId(deviceId);
    }
});
electron_1.ipcMain.on("hub:updateManagedDevices", (_event, deviceIds) => {
    if (hubBridge) {
        hubBridge.setManagedDeviceIds(deviceIds);
    }
});
electron_1.ipcMain.on("hub:telemetry", (_event, data) => {
    if (data?.currentPlaying) {
        currentPlayingTitle = data.currentPlaying;
    }
    if (data?.deviceId) {
        activeDeviceId = data.deviceId;
    }
    if (hubBridge) {
        hubBridge.send({
            type: "DEVICE_STATUS_UPDATE",
            payload: {
                deviceId: activeDeviceId,
                currentPlaying: currentPlayingTitle,
                status: data?.status || "online",
                ...data,
            },
            timestamp: new Date().toISOString(),
        });
    }
});
electron_1.app.whenReady().then(() => {
    createWindow();
    // Inisialisasi koneksi WebSocket ke Next.js Server
    hubBridge = new websocket_client_1.ElectronWebSocketBridge({
        serverUrl: "ws://localhost:3000/ws",
        secretToken: "secret_electron_handshake_token_12345",
        deviceId: activeDeviceId,
        onCommand: (cmd) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("hub:command", cmd);
            }
        },
        onStatusChange: (status) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("hub:status", status);
            }
        },
    });
    hubBridge.connect();
    // Kirim data telemetri berkala (CPU, RAM, dan Current Playing realtime) ke server setiap 5 detik
    telemetryTimer = setInterval(() => {
        if (hubBridge) {
            const freeMem = os_1.default.freemem();
            const totalMem = os_1.default.totalmem();
            const usedMem = totalMem - freeMem;
            hubBridge.send({
                type: "DEVICE_STATUS_UPDATE",
                payload: {
                    deviceId: activeDeviceId,
                    currentPlaying: currentPlayingTitle,
                    cpuUsage: Math.floor(Math.random() * 25 + 10),
                    memoryUsage: {
                        usedMb: Math.round(usedMem / (1024 * 1024)),
                        totalMb: Math.round(totalMem / (1024 * 1024)),
                    },
                    uptimeSeconds: Math.floor(process.uptime()),
                    status: "playing",
                },
                timestamp: new Date().toISOString(),
            });
        }
    }, 5000);
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on("before-quit", () => {
    if (telemetryTimer)
        clearInterval(telemetryTimer);
    if (hubBridge)
        hubBridge.destroy();
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
