const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const isRender = args.includes("--render") || process.env.TARGET === "render";

const configPath = path.join(__dirname, "../electron/config.json");

// Default URLs
const renderWsUrl = "wss://signage-control-panel.onrender.com/ws";
const localWsUrl = "ws://localhost:3000/ws";

const targetUrl = isRender ? renderWsUrl : localWsUrl;

console.log("=================================================");
console.log(`📦 Menyiapkan Build Electron untuk: ${isRender ? "🚀 RENDER CLOUD" : "💻 LOCALHOST"}`);
console.log(`🔗 Target WebSocket Server: ${targetUrl}`);
console.log("=================================================");

// 1. Tulis konfigurasi permanen ke electron/config.json (tertanam di dalam exe)
fs.writeFileSync(
  configPath,
  JSON.stringify({ serverUrl: targetUrl, builtAt: new Date().toISOString() }, null, 2),
  "utf-8"
);
console.log("✓ Konfigurasi target berhasil ditanamkan ke electron/config.json");

// 2. Mulai build electron-builder
console.log("\n⏳ Sedang memaketkan aplikasi ke folder release/...");
console.log("💡 INFO PENTING:");
console.log("   - Target 'dir' (unpacked folder) selesai dalam hitungan detik.");
console.log("   - Target 'portable' (.exe tunggal) mengompresi data dengan 7-Zip LZMA2.");
console.log("   - Kompresi membutuhkan waktu 2-3 MENIT tanpa log. Mohon jangan ditutup!\n");

try {
  execSync("npx electron-builder --win", { stdio: "inherit" });
  console.log("\n=================================================");
  console.log("🎉 BUILD SUKSES SELESAI!");
  console.log(`📁 File Portable : release/SignageHub Player 0.1.0.exe`);
  console.log(`📁 Folder Unpacked: release/win-unpacked/`);
  console.log(`🔗 Server Terhubung: ${targetUrl}`);
  console.log("=================================================");
} catch (err) {
  console.error("❌ Gagal melakukan build Electron:", err.message);
  process.exit(1);
}
