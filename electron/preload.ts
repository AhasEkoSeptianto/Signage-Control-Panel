/**
 * Secure Preload Script for Electron App
 * Exposes safe APIs to the Electron Renderer process
 */

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktopHub", {
  onCommandReceived: (callback: (command: any) => void) => {
    ipcRenderer.on("hub:command", (_event, value) => callback(value));
  },
  onStatusChange: (callback: (status: "connected" | "disconnected") => void) => {
    ipcRenderer.on("hub:status", (_event, value) => callback(value));
  },
  sendTelemetry: (data: any) => {
    ipcRenderer.send("hub:telemetry", data);
  },
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  switchDevice: (deviceId: string) => ipcRenderer.send("hub:switchDevice", deviceId),
  updateManagedDevices: (deviceIds: string[]) => ipcRenderer.send("hub:updateManagedDevices", deviceIds),
});
