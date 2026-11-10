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
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 900,
        height: 650,
        title: "MJS Desktop Client (Electron)",
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
electron_1.app.whenReady().then(() => {
    createWindow();
    // Inisialisasi koneksi WebSocket ke Next.js Server
    hubBridge = new websocket_client_1.ElectronWebSocketBridge({
        serverUrl: "ws://localhost:3000/ws",
        secretToken: "secret_electron_handshake_token_12345",
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
    // Kirim data telemetri berkala (CPU & RAM) ke server setiap 5 detik
    telemetryTimer = setInterval(() => {
        if (hubBridge) {
            const freeMem = os_1.default.freemem();
            const totalMem = os_1.default.totalmem();
            const usedMem = totalMem - freeMem;
            hubBridge.send({
                type: "DEVICE_STATUS_UPDATE",
                payload: {
                    cpuUsage: Math.floor(Math.random() * 30 + 10), // simulasi CPU usage
                    memoryUsage: {
                        usedMb: Math.round(usedMem / (1024 * 1024)),
                        totalMb: Math.round(totalMem / (1024 * 1024)),
                    },
                    uptimeSeconds: Math.floor(process.uptime()),
                    status: "idle",
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
