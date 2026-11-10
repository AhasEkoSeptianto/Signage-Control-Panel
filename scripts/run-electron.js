const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("==========================================");
console.log("⚡ Menyiapkan & Memulai MJS Electron App...");
console.log("==========================================");

// 1. Compile Electron TypeScript files
try {
  console.log("1. Mengompilasi TypeScript untuk Electron...");
  execSync("npx tsc --project tsconfig.electron.json", { stdio: "inherit" });
  console.log("✓ Kompilasi berhasil.");
} catch (err) {
  console.error("❌ Gagal mengompilasi TypeScript Electron:", err.message);
  process.exit(1);
}

// 2. Salin index.html ke dist-electron jika diperlukan
const srcHtml = path.join(__dirname, "../electron/index.html");
const destHtml = path.join(__dirname, "../dist-electron/index.html");
if (fs.existsSync(srcHtml)) {
  fs.copyFileSync(srcHtml, destHtml);
}

// 3. Hapus variabel lingkungan ELECTRON_RUN_AS_NODE yang diwarisi dari IDE
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

// 4. Cari binary Electron
const electronBinary = require("electron");
const mainEntry = path.join(__dirname, "../dist-electron/main.js");

console.log(`2. Meluncurkan Electron Desktop dari: ${mainEntry}`);

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
