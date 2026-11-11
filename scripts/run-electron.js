const { spawn } = require("child_process");
const path = require("path");

console.log("==========================================");
console.log("⚡ Menjalankan MJS Electron App (JavaScript)...");
console.log("==========================================");

// Hapus variabel lingkungan ELECTRON_RUN_AS_NODE yang diwarisi dari runtime/IDE
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronBinary = require("electron");
const mainEntry = path.join(__dirname, "../electron/main.js");

console.log(`Meluncurkan Electron Desktop dari: ${mainEntry}`);

const child = spawn(electronBinary, [mainEntry], {
  env,
  stdio: "inherit",
  windowsHide: false,
});

child.on("close", (code) => {
  console.log(`Electron keluar dengan kode: ${code}`);
  process.exit(code || 0);
});

child.on("error", (err) => {
  console.error("Gagal meluncurkan Electron:", err);
});
