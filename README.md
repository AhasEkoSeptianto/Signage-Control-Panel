# MJS Stack: Next.js + WebSocket + Electron Hub + Supabase

Arsitektur monolit modular modern yang mengintegrasikan:
1. **Next.js 15 (App Router)** sebagai web frontend & REST API dashboard.
2. **WebSocket Server (Unified on `/ws`)** untuk komunikasi bidirectional real-time dengan aplikasi **Desktop Electron terpisah**.
3. **Supabase Database (PostgreSQL)** untuk persistensi data perangkat (*devices*), audit log, perintah (*commands*), serta fitur real-time sync.

---

## 🏛️ Arsitektur Sistem

```
+--------------------------------------------------------------+
|                    Next.js Web Dashboard                     |
|  (App Router, React 19, Tailwind CSS, useWebSocket Hook)     |
+------------------------------+-------------------------------+
                               |
                   HTTP & WS   |  ws://localhost:3000/ws
                               v
+--------------------------------------------------------------+
|                  Unified Node.js HTTP Server                 |
|                        (server.ts)                           |
|  +---------------------------+----------------------------+  |
|  |     Next.js Request       |      WebSocket Server      |  |
|  |        Handler            |       (ws / noServer)      |  |
|  +---------------------------+----------------------------+  |
|                                            |                 |
|                             +--------------+                 |
|                             v                                |
|                  Connection Manager & Router                 |
|           - Device Auth & Handshake Verification             |
|           - Heartbeat Ping / Pong                            |
|           - Telemetry & Desktop Command Dispatch             |
+-----------------------------+--------------------------------+
          |                   |
          | Service Role      | Bi-directional WebSocket
          v                   v
+-------------------+   +--------------------------------------+
|     Supabase      |   |    Aplikasi Desktop Electron         |
|  (PostgreSQL DB)  |   |    (Proses Terpisah)                 |
|                   |   | - Main process: WebSocket Bridge     |
| - devices         |   | - Preload contextBridge              |
| - commands        |   | - OS native API (shell, notify, dll) |
| - activity_logs   |   +--------------------------------------+
+-------------------+
```

---

## 📁 Struktur Direktori

```
MJS-test-stack/
├── .env.example                     # Template variabel lingkungan
├── .env.local                       # File konfigurasi lokal (Supabase & WS secret)
├── package.json
├── server.ts                        # Custom server (Next.js + WebSocket pada 1 port)
├── tsconfig.json
├── tailwind.config.ts
├── supabase/
│   └── schema.sql                   # Skrip SQL untuk setup database di Supabase
├── electron-sample/                 # Panduan & referensi kode untuk Electron
│   ├── README.md
│   ├── websocket-client.ts          # WebSocket Bridge untuk Electron Main Process
│   └── preload.ts                   # Preload script aman dengan contextBridge
├── scripts/
│   └── mock-electron.ts             # Simulator Electron Client untuk testing instan
└── src/
    ├── app/                         # Next.js App Router
    │   ├── api/
    │   │   ├── ws/status/route.ts   # Endpoint status koneksi WS
    │   │   ├── ws/command/route.ts  # Endpoint kirim perintah via REST
    │   │   └── supabase/health/route.ts # Health check koneksi Supabase
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx                 # Dashboard interaktif
    ├── components/                  # Komponen UI
    │   ├── ActivityLog.tsx          # Stream event & telemetry real-time
    │   ├── CommandPanel.tsx         # Panel pengiriman perintah desktop
    │   ├── DeviceCard.tsx           # Kartu status perangkat Electron
    │   └── SupabaseStatusCard.tsx   # Kartu status Supabase
    ├── hooks/
    │   └── use-websocket.ts         # React hook untuk WebSocket client di browser
    ├── lib/
    │   └── supabase/                # Klien Supabase (Client, Server, Admin)
    │       ├── admin.ts
    │       ├── client.ts
    │       ├── is-configured.ts
    │       └── server.ts
    ├── services/
    │   └── device.service.ts        # Layer servis bisnis & persistensi Supabase
    └── types/
        ├── database.ts              # Definisi tipe TypeScript Supabase
        └── websocket.ts             # Envelope protokol & tipe pesan WebSocket
```

---

## 🚀 Cara Menjalankan

### 1. Jalankan Next.js + WebSocket Server
```bash
npm run dev
```
Aplikasi web akan berjalan di `http://localhost:3000` dan WebSocket Server di `ws://localhost:3000/ws`.

### 2. Jalankan Simulator Electron (Untuk Testing Langsung)
Buka terminal baru di direktori yang sama:
```bash
npm run mock:electron
```
Simulator ini akan:
- Terhubung ke server WebSocket dan melakukan registrasi handshake.
- Mengirimkan data telemetri (CPU & RAM) setiap 5 detik.
- Menerima dan merespons perintah dari dashboard web.

---

## 🗄️ Setup Database Supabase

1. Buka [Dashboard Supabase](https://supabase.com).
2. Buat proyek baru atau pilih proyek yang sudah ada.
3. Buka menu **SQL Editor**, salin seluruh isi file `supabase/schema.sql` dan klik **Run**.
4. Masuk ke **Project Settings -> API** untuk mendapatkan kredensial:
   - `Project URL`
   - `anon / public key`
   - `service_role key` (simpan dengan aman di backend saja)
5. Isi variabel tersebut ke dalam file `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://proyek-anda.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

---

## 🔌 Menghubungkan ke Aplikasi Electron Anda

Lihat petunjuk lengkap dan contoh kode siap pakai di folder `electron-sample/`.
Cukup gunakan class `ElectronWebSocketBridge` di proses utama (*main process*) Electron Anda.
