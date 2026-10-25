// Starts the FastAPI backend from fastapi/.venv. Used by `npm run dev`.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { BACKEND_DIR, hasApiKey, log, venvPython } from "./backend.mjs";

if (!existsSync(venvPython())) {
  log("the Python backend isn't set up yet. Run: npm run setup");
  process.exit(1);
}

if (!hasApiKey()) {
  log("no ANTHROPIC_API_KEY found. Paste it into fastapi/.env, or shaders won't generate.");
}

const api = spawn(venvPython(), ["-m", "uvicorn", "app:app", "--port", "8000", "--reload"], {
  cwd: BACKEND_DIR,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => api.kill(signal));
}
api.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
