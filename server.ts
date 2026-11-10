import { createServer } from "http";
import next from "next";
import dotenv from "dotenv";
import { initWebSocketServer } from "./src/server/websocket/ws-server";
import { RealtimeHubService } from "./src/services/realtime-hub.service";

// Load environment variables (.env.local, then .env)
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function bootstrap() {
  try {
    await app.prepare();

    const server = createServer(async (req, res) => {
      try {
        await handle(req, res);
      } catch (err) {
        console.error("Error handling request:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    // Initialize WebSocket layer on the same HTTP server
    initWebSocketServer(server);

    // Initialize Supabase Realtime synchronization listener (if configured)
    RealtimeHubService.init();

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
