import { createServer } from "http";
import { parse } from "url";
import next from "next";
import dotenv from "dotenv";
import { initWebSocketServer } from "./src/server/websocket/ws-server";
import { RealtimeHubService } from "./src/services/realtime-hub.service";

// Load environment variables (.env.local, then .env)
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

async function bootstrap() {
  try {
    await app.prepare();

    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url || "/", true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling request:", err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      }
    });

    // Initialize WebSocket layer on the same HTTP server
    initWebSocketServer(server);

    // Initialize Supabase Realtime synchronization listener (if configured)
    RealtimeHubService.init();

    server.once("error", (err) => {
      console.error("HTTP Server Error:", err);
      process.exit(1);
    });

    server.listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> WebSocket ready on ws://${hostname}:${port}/ws`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

bootstrap();
