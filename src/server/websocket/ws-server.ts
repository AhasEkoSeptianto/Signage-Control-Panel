import { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { ConnectionManager } from "./connection-manager";
import { MessageRouter } from "./message-router";

let wss: WebSocketServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Initializes and binds the WebSocket server to the existing Node.js HTTP server.
 */
export function initWebSocketServer(server: HttpServer): WebSocketServer {
  if (wss) return wss;

  wss = new WebSocketServer({ noServer: true });
  const manager = ConnectionManager.getInstance();
  const router = MessageRouter.getInstance();

  // Handle upgrade requests
  server.on("upgrade", (request: IncomingMessage, socket, head) => {
    try {
      const { pathname } = new URL(request.url || "/", "http://localhost");

      // Route only requests directed at /ws or /api/ws
      if (pathname === "/ws" || pathname === "/api/ws") {
        wss!.handleUpgrade(request, socket, head, (ws) => {
          wss!.emit("connection", ws, request);
        });
      }
    } catch (err) {
      console.error("[WS Server] Error handling upgrade:", err);
    }
  });

  // Handle new WebSocket connection
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    // Set up message listener
    ws.on("message", async (data: Buffer | string) => {
      await router.handleMessage(ws, data.toString());
    });

    // Handle ping/pong
    ws.on("pong", () => {
      manager.markAlive(ws);
    });

    // Handle socket closure
    ws.on("close", () => {
      manager.removeClient(ws);
    });

    // Handle error
    ws.on("error", (err) => {
      console.error("[WS Server] Socket error:", err.message);
      manager.removeClient(ws);
    });
  });

  // Periodic heartbeat every 30 seconds
  heartbeatInterval = setInterval(() => {
    manager.checkDeadConnections();
  }, 30000);

  console.log("[WS Server] WebSocket Server initialized on path /ws");
  return wss;
}

export function closeWebSocketServer(): void {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (wss) {
    wss.close();
    wss = null;
  }
}
