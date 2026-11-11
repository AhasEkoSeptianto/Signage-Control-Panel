# SignageHub: Fleet Manager & Electron Player Stack

Arsitektur monolit modern dan terintegrasi untuk ekosistem **Digital Signage Enterprise**, menggabungkan:

1. **Next.js 15 (App Router & React 19)** sebagai Web Admin Dashboard & REST API.
2. **Unified WebSocket Server (`/ws`)** untuk komunikasi bidirectional berkecepatan tinggi antara server dan client.
3. **Electron Desktop Player Client (JavaScript Murni)** sebagai node player layar digital signage yang dapat menerima push konten secara instan.
4. **Dual-Layer Persistence (Supabase + Local JSON Fallback)** untuk keandalan data perangkat dan katalog konten secara offline maupun online.

---

## 🏛️ Arsitektur Sistem

```
+------------------------------------------------------------------------+
|                     Next.js Web Admin Dashboard                        |
|        (App Router, React 19, Tailwind CSS, useWebSocket Hook)         |
|  - Devices & Fleet: Monitor online/offline, edit lokasi, push video    |
|  - Content & Media: Katalog video & broadcast push ke display node     |
+-----------------------------------+------------------------------------+
                                    |
                        HTTP & WS   |  ws://localhost:3000/ws
                                    v
+------------------------------------------------------------------------+
|                      Unified Node.js HTTP Server                       |
|                              (server.ts)                               |
|  +--------------------------------+---------------------------------+  |
|  |     Next.js Request Handler    |     WebSocket Server (/ws)      |  |
|  |       (API Routes & Pages)     |       (ws - noServer mode)      |  |
|  +--------------------------------+---------------------------------+  |
|                                                    |                   |
|                                     +--------------+                   |
|                                     v                                  |
|                          Connection Manager & Router                   |
|                   - Token Handshake & Role Identification              |
|                   - Device Mapping & Heartbeat Check (30s)             |
|                   - Real-time Command Dispatching & ACK                |
+------------------------------------+-----------------------------------+
           |                         |
           | REST / Service Role     | Bi-directional WebSocket
           v                         v
+-----------------------+   +--------------------------------------------+
|  Dual-Layer Storage   |   |        Electron Player Node Client         |
|                       |   |               (electron/)                  |
| 1. Supabase (Postgres)|   | - Pure JavaScript CommonJS (Instan dev)    |
|    - devices          |   | - Video Player Looping (HTML5 Video)       |
|    - contents         |   | - Clean Screen Kiosk Mode (Shortcut 'C')   |
|    - desktop_commands |   | - Real-time Telemetry (RAM, CPU, Uptime)   |
| 2. Local Fallback JSON|   | - Multi-Device Identity & Standby Mode     |
|    - data/devices.json|   +--------------------------------------------+
|    - data/contents.json
+-----------------------+
```

---

## 📁 Struktur Direktori

```
MJS-test-stack/
├── data/                       # Penyimpanan lokal persistent (fallback offline)
│   ├── contents.json           # Data katalog media & playlist
│   └── devices.json            # Data registrasi & lokasi perangkat
├── electron/                   # Aplikasi Desktop Player (JavaScript Murni)
│   ├── index.html              # Antarmuka display player & video stage
│   ├── main.js                 # Electron main process & IPC handlers
│   ├── preload.js              # Secure contextBridge preload script
│   └── websocket-client.js     # WebSocket client engine & reconnect loop
├── scripts/
│   └── run-electron.js         # Runner otomatis untuk development Electron
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # REST API endpoints (/api/devices, /api/contents)
│   │   ├── content/page.tsx    # Halaman manajemen konten & push media
│   │   ├── login/page.tsx      # Halaman login administrator
│   │   ├── register/page.tsx   # Halaman registrasi administrator
│   │   └── page.tsx            # Dashboard utama: Devices & Fleet Monitoring
│   ├── components/layout/      # Komponen navigasi (SignageHeader, SignageSidebar, SignageShell)
│   ├── hooks/                  # Custom React hooks (useWebSocket)
│   ├── lib/supabase/           # Supabase client & environment helpers
│   ├── server/websocket/       # Engine WebSocket Server
│   │   ├── connection-manager.ts # Manajemen soket aktif & role
│   │   ├── message-router.ts   # Router pesan, autentikasi, & command routing
│   │   └── ws-server.ts        # Inisialisasi WebSocket di server HTTP
│   ├── services/               # Layanan bisnis (DeviceService, ContentService)
│   └── types/                  # TypeScript interface definisi data & WebSocket
├── package.json
├── server.ts                   # Entry point server utama (Next.js + WebSocket)
└── tailwind.config.ts
```

---

## 🚀 Panduan Memulai

### 1. Prasyarat
* **Node.js**: Versi 18.x atau lebih baru
* **npm**: Versi 9.x atau lebih baru

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (.env.local)
Salin `.env.example` menjadi `.env.local` jika diperlukan penyesuaian:
```env
PORT=3000
NODE_ENV=development

# WebSocket Secret Handshake Token
WS_AUTH_SECRET=secret_electron_handshake_token_12345

# Supabase (Opsional - Jika kosong, sistem otomatis memakai fallback Local JSON)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 💻 Menjalankan Aplikasi

### A. Menjalankan Dashboard Admin + WebSocket Server
```bash
npm run dev
```
* **Dashboard Admin**: Buka browser di [http://localhost:3000](http://localhost:3000)
* **WebSocket Endpoint**: `ws://localhost:3000/ws`

### B. Menjalankan Electron Player Client
Buka terminal baru di folder yang sama:
```bash
npm run electron:dev
```
Aplikasi desktop Electron akan langsung terbuka dalam sekejap tanpa jeda kompilasi.

### C. Build Installer Windows (.exe)
Untuk membuat paket executable standalone (Portable & Directory build) untuk sistem operasi Windows:
```bash
npm run electron:dist
```
File output installer akan berada di dalam direktori `release/`.

---

## 📺 Fitur Client Player Electron

| Fitur | Deskripsi |
| :--- | :--- |
| **Pure JavaScript** | Menggunakan JavaScript murni tanpa build tool, mempercepat iterasi development. |
| **Mode Layar Bersih (Clean Kiosk)** | Tekan tombol **`C`** untuk menyembunyikan seluruh kontrol UI, header, dan badge, menampilkan video murni tanpa distraksi. |
| **Layar Penuh (Fullscreen)** | Tekan **`F11`** untuk masuk/keluar mode fullscreen signage. |
| **Play / Pause** | Tekan tombol **`Spasi`** untuk jeda/putar video. |
| **Multi-Device Switcher** | Pengguna dapat mengganti ID node perangkat (misal `DEV-01`, `DEV-02`) secara dinamis langsung dari drawer aplikasi. |
| **Mode Standby** | Jika diputuskan dari dashboard, layar otomatis masuk ke mode Standby yang elegan. |
| **Auto-Reconnect** | Koneksi WebSocket otomatis menyambung kembali setiap 4 detik bila server terputus. |

---

## 📡 Protokol WebSocket

Komunikasi antar node menggunakan format JSON terstruktur:

### 1. Registrasi Client (`AUTH_REGISTER`)
```json
{
  "type": "AUTH_REGISTER",
  "senderId": "DEV-01",
  "payload": {
    "role": "electron",
    "secretToken": "secret_electron_handshake_token_12345",
    "deviceMeta": {
      "deviceName": "DESKTOP-NODE",
      "platform": "win32",
      "arch": "x64",
      "appVersion": "1.0.0"
    }
  },
  "timestamp": "2026-11-11T07:00:00.000Z"
}
```

### 2. Push Media dari Dashboard (`DESKTOP_COMMAND`)
```json
{
  "type": "DESKTOP_COMMAND",
  "targetId": "DEV-01",
  "payload": {
    "command": "OPEN_URL",
    "args": {
      "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "title": "Video Promo Diskon Spesial",
      "deviceId": "DEV-01"
    },
    "commandId": "cmd-1710000000"
  },
  "timestamp": "2026-11-11T07:00:00.000Z"
}
```

### 3. Update Konfigurasi Lokasi (`UPDATE_DEVICE_CONFIG`)
```json
{
  "type": "DESKTOP_COMMAND",
  "targetId": "ALL",
  "payload": {
    "command": "UPDATE_DEVICE_CONFIG",
    "args": {
      "id": "DEV-01",
      "lokasi": "Lobby Utama Lantai 1"
    }
  },
  "timestamp": "2026-11-11T07:00:00.000Z"
}
```

### 4. Telemetri Real-time Perangkat (`DEVICE_STATUS_UPDATE`)
```json
{
  "type": "DEVICE_STATUS_UPDATE",
  "payload": {
    "deviceId": "DEV-01",
    "currentPlaying": "Video Promo Diskon Spesial",
    "status": "playing",
    "cpuUsage": 14,
    "memoryUsage": { "usedMb": 4200, "totalMb": 16384 },
    "uptimeSeconds": 1280
  },
  "timestamp": "2026-11-11T07:00:00.000Z"
}
```
