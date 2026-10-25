// Where the FastAPI backend and its virtualenv live, shared by the setup and dev scripts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BACKEND_DIR = path.join(ROOT, "fastapi");
export const VENV_DIR = path.join(BACKEND_DIR, ".venv");
export const ENV_FILE = path.join(BACKEND_DIR, ".env");

export function venvPython() {
  return process.platform === "win32"
    ? path.join(VENV_DIR, "Scripts", "python.exe")
    : path.join(VENV_DIR, "bin", "python");
}

// The key can be exported in the shell or written in fastapi/.env
export function hasApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return true;
  if (!existsSync(ENV_FILE)) return false;
  return /^\s*(export\s+)?ANTHROPIC_API_KEY\s*=\s*["']?[^\s"'#]/m.test(
    readFileSync(ENV_FILE, "utf8")
  );
}

export function log(message) {
  console.log(`[aurashader] ${message}`);
}
