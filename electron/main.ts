import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import { ElectronWebSocketBridge } from "./websocket-client";

let mainWindow: BrowserWindow | null = null;
let hubBridge: ElectronWebSocketBridge | null = null;
let telemetryTimer: NodeJS.Timeout | null = null;
let currentPlayingTitle = "Video Promo Diskon Spesial";
let activeDeviceId = process.env.DEVICE_ID || "DEV-01";
const wsServerUrl = process.env.WS_SERVER_URL || process.env.HUB_SERVER_URL || "ws://localhost:3000/ws";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    title: "SignageHub - Fleet Player Node",
    backgroundColor: "#031427",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const htmlPath = fs.existsSync(path.join(__dirname, "index.html"))
    ? path.join(__dirname, "index.html")
    : path.join(__dirname, "../electron/index.html");

  mainWindow.loadFile(htmlPath);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.on("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("window:close", () => {
  mainWindow?.close();
});

ipcMain.on("hub:switchDevice", (_event, deviceId: string) => {
  activeDeviceId = deviceId;
  if (hubBridge) {
    hubBridge.switchDeviceId(deviceId);
  }
});

ipcMain.on("hub:updateManagedDevices", (_event, deviceIds: string[]) => {
  if (hubBridge) {
    hubBridge.setManagedDeviceIds(deviceIds);
  }
});

ipcMain.on("hub:telemetry", (_event, data: any) => {
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

// Helper untuk memulai koneksi telemetri dan websocket
function startConnection(options?: { deviceId?: string; serverUrl?: string }) {
  if (options?.deviceId) {
    activeDeviceId = options.deviceId;
    hubBridge?.switchDeviceId(options.deviceId);
  }

  console.log(`[Electron Main] Memulai koneksi ke Hub Server untuk ${activeDeviceId}...`);
  hubBridge?.connect();

  // Mulai kirim telemetri berkala hanya setelah terhubung
  if (telemetryTimer) clearInterval(telemetryTimer);
  telemetryTimer = setInterval(() => {
    if (hubBridge && hubBridge.isConnected) {
      const freeMem = os.freemem();
      const totalMem = os.totalmem();
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
}

// Helper untuk menghentikan koneksi telemetri dan websocket
function stopConnection() {
  console.log(`[Electron Main] Memutus koneksi Hub Server...`);
  if (telemetryTimer) {
    clearInterval(telemetryTimer);
    telemetryTimer = null;
  }
  hubBridge?.disconnect();
}

// IPC Handlers untuk kontrol koneksi eksplisit dari antarmuka
ipcMain.handle("hub:connect", (_event, options) => {
  startConnection(options);
  return true;
});

ipcMain.handle("hub:disconnect", () => {
  stopConnection();
  return true;
});

ipcMain.handle("hub:getStatus", () => {
  return hubBridge?.isConnected ? "connected" : "disconnected";
});

ipcMain.handle("hub:logout", () => {
  stopConnection();
  return true;
});

app.whenReady().then(() => {
  createWindow();

  // Inisialisasi bridge WebSocket ke Next.js Server (DEFAULT: BELUM TERHUBUNG)
  hubBridge = new ElectronWebSocketBridge({
    serverUrl: wsServerUrl,
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

  // CATATAN: Default saat aplikasi baru install/start adalah TIDAK terhubung.
  // hubBridge.connect() HANYA dipanggil saat operator login atau menekan Hubungkan.

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  stopConnection();
  if (hubBridge) hubBridge.destroy();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
