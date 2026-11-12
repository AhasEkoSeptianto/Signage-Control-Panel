const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const { ElectronWebSocketBridge } = require("./websocket-client");

let appConfig = {};
try {
  appConfig = require("./config.json");
} catch {}

let mainWindow = null;
let hubBridge = null;
let telemetryTimer = null;
let currentPlayingTitle = "Video Promo Diskon Spesial";
let activeDeviceId = process.env.DEVICE_ID || "DEV-01";
const wsServerUrl =
  process.env.WS_SERVER_URL ||
  process.env.HUB_SERVER_URL ||
  appConfig.serverUrl ||
  "ws://localhost:3000/ws";

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

  mainWindow.loadFile(path.join(__dirname, "index.html"));
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

ipcMain.on("hub:switchDevice", (_event, deviceId) => {
  activeDeviceId = deviceId;
  if (hubBridge) {
    hubBridge.switchDeviceId(deviceId);
  }
});

ipcMain.on("hub:updateManagedDevices", (_event, deviceIds) => {
  if (hubBridge) {
    hubBridge.setManagedDeviceIds(deviceIds);
  }
});

ipcMain.on("hub:telemetry", (_event, data) => {
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
function startConnection(options) {
  if (options?.deviceId) {
    activeDeviceId = options.deviceId;
    hubBridge?.switchDeviceId(options.deviceId);
  }

  console.log(
    `[Electron Main] Memulai koneksi ke Hub Server untuk ${activeDeviceId}...`,
  );
  hubBridge?.connect();

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

// IPC Handlers untuk kontrol koneksi dari antarmuka
ipcMain.handle("hub:connect", (_event, options) => {
  startConnection(options);
  return true;
});

ipcMain.handle("hub:disconnect", () => {
  stopConnection();
  return true;
});

app.whenReady().then(() => {
  createWindow();

  // Inisialisasi bridge WebSocket ke Next.js Server (DEFAULT: STANDBY)
  hubBridge = new ElectronWebSocketBridge({
    serverUrl: wsServerUrl,
    secretToken: "secret_electron_handshake_token_12345",
    deviceId: activeDeviceId,
    onCommand: (cmd) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("hub:command", cmd);
      }
    },
    onStatusChange: (status, info) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("hub:status", status, info);
      }
    },
    onAuthError: (error) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("hub:authError", error);
      }
    },
    onAuthSuccess: (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("hub:authSuccess", data);
      }
    },
  });

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
