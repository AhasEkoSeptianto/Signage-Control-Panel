# Integrasi Client Electron Desktop ke Next.js WebSocket Hub

Folder ini berisi implementasi client desktop player berbasis **JavaScript murni (CommonJS)** yang terhubung langsung ke WebSocket Server Next.js.

---

## 🛠️ Arsitektur Client Electron

* [`electron/main.js`](./main.js): Inisialisasi jendela Electron, konfigurasi BrowserWindow, IPC handlers, dan timer telemetri.
* [`electron/preload.js`](./preload.js): Jembatan aman `contextBridge` untuk meneruskan API ke antarmuka renderer (`index.html`).
* [`electron/websocket-client.js`](./websocket-client.js): Mesin koneksi WebSocket, *auto-reconnect*, registrasi handshake, dan penerima *push command*.
* [`electron/index.html`](./index.html): Tampilan antarmuka display player, pemutar video HTML5, kontrol layar bersih (*Clean Mode*), dan *device switcher*.

---

## 🚀 Cara Menjalankan Client

### 1. Mode Development:
```bash
npm run electron:dev
```
Aplikasi langsung dijalankan menggunakan binary Electron tanpa perlu langkah kompilasi (`tsc`).

### 2. Mode Produksi / Packaging Windows:
```bash
npm run electron:dist
```
Hasil file installer executable (.exe portable & unpacked directory) akan dibuat di dalam folder `release/`.

---

## ⌨️ Pintasan Keyboard (Shortcuts)

* **`C`**: Mengaktifkan / menonaktifkan **Mode Layar Bersih (Clean Screen Mode)**. Seluruh badge, kontrol, dan panel navigasi akan disembunyikan untuk menayangkan video secara murni.
* **`F11`**: Masuk / keluar dari mode **Layar Penuh (Fullscreen Kiosk)**.
* **`Spasi`**: Jeda (*Pause*) / Putar (*Play*) video.
* **`Esc`**: Menutup dialog drawer atau keluar dari mode layar bersih.
