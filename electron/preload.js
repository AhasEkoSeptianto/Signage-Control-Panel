/**
 * Secure Preload Script for Electron App
 * Exposes safe APIs to the Electron Renderer process
 */

const { contextBridge, ipcRenderer } = require("electron");

let appConfig = {};
try {
  appConfig = require("./config.json");
} catch {}

const effectiveServerUrl = process.env.WS_SERVER_URL || process.env.HUB_SERVER_URL || appConfig.serverUrl || "ws://localhost:3000/ws";

contextBridge.exposeInMainWorld("desktopHub", {
  serverUrl: effectiveServerUrl,
  onCommandReceived: (callback) => {
    ipcRenderer.on("hub:command", (_event, value) => callback(value));
  },
  onStatusChange: (callback) => {
    ipcRenderer.on("hub:status", (_event, value) => callback(value));
  },
  sendTelemetry: (data) => {
    ipcRenderer.send("hub:telemetry", data);
  },
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  switchDevice: (deviceId) => ipcRenderer.send("hub:switchDevice", deviceId),
  updateManagedDevices: (deviceIds) => ipcRenderer.send("hub:updateManagedDevices", deviceIds),
  connectServer: (options) => ipcRenderer.invoke("hub:connect", options),
  disconnectServer: () => ipcRenderer.invoke("hub:disconnect"),
});
