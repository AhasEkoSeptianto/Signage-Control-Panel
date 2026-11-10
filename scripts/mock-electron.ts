/**
 * Mock Electron Desktop Client
 * Simulates a separate Electron Desktop app communicating with the Next.js WebSocket Server.
 *
 * Run with: npm run mock:electron
 */

import { WebSocket } from "ws";
import dotenv from "dotenv";
import os from "os";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000/ws";
const AUTH_TOKEN = process.env.WS_AUTH_SECRET || "secret_electron_handshake_token_12345";
const DEVICE_ID = `electron-client-${os.hostname().toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

console.log("=================================================");
console.log(" Starting Simulated Electron Desktop Client");
console.log(` Device ID : ${DEVICE_ID}`);
console.log(` Target WS : ${WS_URL}`);
console.log("=================================================");

function connect() {
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("✓ Connected to WebSocket server! Sending AUTH_REGISTER...");

    // Send registration & device metadata
    ws.send(
      JSON.stringify({
        type: "AUTH_REGISTER",
        senderId: DEVICE_ID,
        payload: {
          role: "electron",
          secretToken: AUTH_TOKEN,
          deviceMeta: {
            deviceName: `${os.hostname()} (Simulated Electron)`,
            platform: process.platform,
            arch: process.arch,
            appVersion: "1.0.0-electron-demo",
            osVersion: os.release(),
          },
        },
        timestamp: new Date().toISOString(),
      })
    );

    // Start sending periodic device telemetry every 5 seconds
    const telemetryInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const usedMem = totalMem - freeMem;

        ws.send(
          JSON.stringify({
            type: "DEVICE_STATUS_UPDATE",
            senderId: DEVICE_ID,
            payload: {
              cpuUsage: Math.floor(Math.random() * 40 + 10), // simulated 10-50%
              memoryUsage: {
                usedMb: Math.round(usedMem / (1024 * 1024)),
                totalMb: Math.round(totalMem / (1024 * 1024)),
              },
              uptimeSeconds: Math.floor(process.uptime()),
              status: "idle",
            },
            timestamp: new Date().toISOString(),
          })
        );
      }
    }, 5000);

    ws.on("close", () => {
      clearInterval(telemetryInterval);
    });
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log(`\n[← Received from Server] Type: ${msg.type}`);

      if (msg.type === "AUTH_SUCCESS") {
        console.log("✓ Authenticated successfully with server!");
      }

      if (msg.type === "DESKTOP_COMMAND") {
        console.log("▶ Received Command:", msg.payload.command, msg.payload.args);
        const { command, args, commandId } = msg.payload;

        // Simulate processing command in Electron main process
        setTimeout(() => {
          let executionResult: unknown = null;

          switch (command) {
            case "OPEN_URL":
              console.log(`[Electron Native Action] Opening shell URL: ${args?.url}`);
              executionResult = { openedUrl: args?.url, openedAt: new Date().toISOString() };
              break;

            case "NOTIFY":
              console.log(`[Electron Native Action] Showing system notification: "${args?.title}" - "${args?.body}"`);
              executionResult = { notified: true };
              break;

            case "GET_SYSTEM_INFO":
              executionResult = {
                hostname: os.hostname(),
                cpus: os.cpus().length,
                totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
                platform: process.platform,
              };
              break;

            default:
              executionResult = { acknowledged: true, command, args };
          }

          // Return result back to WebSocket server
          ws.send(
            JSON.stringify({
              type: "DESKTOP_COMMAND_RESULT",
              senderId: DEVICE_ID,
              targetId: msg.senderId,
              correlationId: msg.correlationId,
              payload: {
                commandId,
                success: true,
                result: executionResult,
              },
              timestamp: new Date().toISOString(),
            })
          );
          console.log(`[→ Sent Command Result] for command ${commandId}`);
        }, 800);
      }
    } catch (err) {
      console.error("Error parsing message:", err);
    }
  });

  ws.on("close", (code, reason) => {
    console.warn(`Connection closed (${code} - ${reason || "none"}). Reconnecting in 3s...`);
    setTimeout(connect, 3000);
  });

  ws.on("error", (err) => {
    console.error("WebSocket Error:", err.message);
  });
}

connect();
