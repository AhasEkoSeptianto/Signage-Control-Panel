"use strict";
/**
 * Secure Preload Script for Electron App
 * Exposes safe APIs to the Electron Renderer process
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("desktopHub", {
    onCommandReceived: (callback) => {
        electron_1.ipcRenderer.on("hub:command", (_event, value) => callback(value));
    },
    onStatusChange: (callback) => {
        electron_1.ipcRenderer.on("hub:status", (_event, value) => callback(value));
    },
    sendTelemetry: (data) => {
        electron_1.ipcRenderer.send("hub:telemetry", data);
    },
});
