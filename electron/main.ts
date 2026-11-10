import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import { ElectronWebSocketBridge } from "./websocket-client";

let mainWindow: BrowserWindow | null = null;
let hubBridge: ElectronWebSocketBridge | null = null;
let telemetryTimer: NodeJS.Timeout | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    title: "MJS Desktop Client (Electron)",
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

app.whenReady().then(() => {
  createWindow();

  // Inisialisasi koneksi WebSocket ke Next.js Server
  hubBridge = new ElectronWebSocketBridge({
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
      const freeMem = os.freemem();
      const totalMem = os.totalmem();
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  if (telemetryTimer) clearInterval(telemetryTimer);
  if (hubBridge) hubBridge.destroy();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
