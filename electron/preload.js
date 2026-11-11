/**
 * Secure Preload Script for Electron App
 * Exposes safe APIs to the Electron Renderer process
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopHub", {
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
  getConnectionStatus: () => ipcRenderer.invoke("hub:getStatus"),
  logout: () => ipcRenderer.invoke("hub:logout"),
});
