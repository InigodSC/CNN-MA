// start.js — Lanza backend y frontend en paralelo
// Ejecutar desde la raíz del proyecto: node start.js

const { spawn } = require("child_process");
const path = require("path");

const ROOT = __dirname;

const BACKEND_DIR  = path.join(ROOT, "backend");
const FRONTEND_DIR = path.join(ROOT, "frontend");

const VENV_PYTHON  = path.join(BACKEND_DIR, "venv_back_clase", "Scripts", "python.exe");
const UVICORN      = path.join(BACKEND_DIR, "venv_back_clase", "Scripts", "uvicorn.exe");

console.log("\n🍄 ====================================");
console.log("   Clasificador de Setas - Iniciando");
console.log("======================================\n");

// ── BACKEND ────────────────────────────────────────────────────────────────
const backend = spawn(UVICORN, [
  "main:app",
  "--reload",
  "--host", "0.0.0.0",
  "--port", "8000"
], {
  cwd: BACKEND_DIR,
  shell: false,
  stdio: "pipe",
});

backend.stdout.on("data", (data) => {
  process.stdout.write(`\x1b[32m[BACKEND]\x1b[0m ${data}`);
});
backend.stderr.on("data", (data) => {
  process.stdout.write(`\x1b[32m[BACKEND]\x1b[0m ${data}`);
});
backend.on("close", (code) => {
  console.log(`\x1b[32m[BACKEND]\x1b[0m Proceso terminado (código ${code})`);
});

// ── FRONTEND ───────────────────────────────────────────────────────────────
const frontend = spawn("npm", ["start"], {
  cwd: FRONTEND_DIR,
  shell: true,
  stdio: "pipe",
  env: { ...process.env, BROWSER: "true" },
});

frontend.stdout.on("data", (data) => {
  process.stdout.write(`\x1b[36m[FRONTEND]\x1b[0m ${data}`);
});
frontend.stderr.on("data", (data) => {
  process.stdout.write(`\x1b[36m[FRONTEND]\x1b[0m ${data}`);
});
frontend.on("close", (code) => {
  console.log(`\x1b[36m[FRONTEND]\x1b[0m Proceso terminado (código ${code})`);
});

// ── INFO ───────────────────────────────────────────────────────────────────
console.log("✅ Backend  → http://localhost:8000");
console.log("✅ Frontend → http://localhost:3000");
console.log("\nPresiona Ctrl+C para detener ambos servicios.\n");

// ── CIERRE LIMPIO ──────────────────────────────────────────────────────────
process.on("SIGINT", () => {
  console.log("\n\n🛑 Deteniendo servicios...");
  backend.kill();
  frontend.kill();
  process.exit(0);
});
