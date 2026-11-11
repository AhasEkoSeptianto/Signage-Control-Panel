const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../electron/index.html");
const dest = path.join(__dirname, "../dist-electron/index.html");

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("✓ index.html berhasil disalin ke dist-electron/");
