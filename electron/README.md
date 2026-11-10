# Integrasi Electron Desktop ke Next.js WebSocket Hub

Folder ini berisi referensi implementasi untuk menghubungkan aplikasi Electron desktop yang terpisah ke WebSocket Server Next.js.

## Cara Pemasangan di Aplikasi Electron Anda:

1. **Install dependensi WebSocket di project Electron:**
   ```bash
   npm install ws
   npm install --save-dev @types/ws
   ```

2. **Inisialisasi di `src/main/index.ts` atau `main.js`:**
   ```ts
   import { ElectronWebSocketBridge } from "./websocket-client";

   app.whenReady().then(() => {
     // Buat window seperti biasa
     createWindow();

     // Hubungkan ke Next.js WebSocket Hub
     const hubBridge = new ElectronWebSocketBridge({
       serverUrl: "ws://localhost:3000/ws", // atau wss://domain-anda.com/ws di produksi
       secretToken: "secret_electron_handshake_token_12345", // sesuaikan dengan WS_AUTH_SECRET di .env.local
     });

     hubBridge.connect();

     app.on("before-quit", () => {
       hubBridge.destroy();
     });
   });
   ```

3. **Perintah Native yang Didukung Secara Default:**
   - `OPEN_URL`: Membuka browser default OS via `shell.openExternal`.
   - `NOTIFY`: Menampilkan notifikasi OS asli desktop.
   - `GET_SYSTEM_INFO`: Membaca CPU, RAM, OS info.
   - Anda dapat menambahkan handler kustom (misal: kontrol hardware, printer thermal, local file system, scanner barcode, dll.) di switch case `handleMessage` pada `websocket-client.ts`.
