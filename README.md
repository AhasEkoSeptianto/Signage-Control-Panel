# MJS Stack: Next.js + WebSocket + Electron Hub + Supabase

Arsitektur monolit modular modern yang mengintegrasikan:

1. **Next.js 15 (App Router)** sebagai web frontend & REST API dashboard.
2. **WebSocket Server (Unified on `/ws`)** untuk komunikasi bidirectional real-time dengan aplikasi **Desktop Electron terpisah**.

3. **Supabase Database (PostgreSQL)** untuk persistensi data perangkat (_devices_ dan **content**), serta fitur real-time sync.

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
|           - Content management device                        |
+-----------------------------+--------------------------------+
          |                   |
          | Service Role      | Bi-directional WebSocket
          v                   v
+-------------------+   +--------------------------------------+
|     Supabase      |   |    Aplikasi Desktop Electron         |
|  (PostgreSQL DB)  |   |    (Proses Terpisah)                 |
|                   |   | - Main process: WebSocket Bridge     |
| - devices         |   | - Melihat content                    |
| - content         |   |                                      |
+-------------------+   +--------------------------------------+

```

---

---

## 🚀 Cara Menjalankan

### 1. Jalankan Next.js + WebSocket Server

```bash
npm run dev
```

Aplikasi web akan berjalan di `http://localhost:3000` dan WebSocket Server di `ws://localhost:3000/ws`.

### 2. Jalankan Simulator Electron (Untuk Testing Client)

Buka terminal baru di direktori yang sama:

```bash
npm electron:dev
```

Atau bisa juga packaging menjadi .exe agar bisa dipakai windows

```bash
npm electron:dist
```

Simulator ini akan:

- Terhubung ke server WebSocket dan melakukan registrasi handshake.
- Dapat menghubungkan ke device yang sudah ada di dashboard admin
- Melihat content yang ada

---
