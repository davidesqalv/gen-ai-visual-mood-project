// Sets up the FastAPI backend: finds Python 3.10+, makes fastapi/.venv,
// installs the requirements and creates fastapi/.env. Runs on `npm install`,
// and again with `npm run setup`.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { BACKEND_DIR, ENV_FILE, VENV_DIR, hasApiKey, log, venvPython } from "./backend.mjs";

const MIN_PYTHON = [3, 10];

function fail(message) {
  console.error(`[aurashader] ${message}`);
  process.exit(1);
}

// [major, minor] if the command is a working Python, otherwise null
function pythonVersion(command, args = []) {
  const result = spawnSync(
    command,
    [...args, "-c", "import sys; print(sys.version_info[0], sys.version_info[1])"],
    { encoding: "utf8" }
  );
  if (result.status !== 0) return null;
  return result.stdout.trim().split(" ").map(Number);
}

function isNewEnough([major, minor]) {
  return major > MIN_PYTHON[0] || (major === MIN_PYTHON[0] && minor >= MIN_PYTHON[1]);
}

function findPython() {
  const candidates = [];
  if (process.env.PYTHON) candidates.push([process.env.PYTHON, []]);
  candidates.push(["python3", []], ["python", []]);
  if (process.platform === "win32") candidates.push(["py", ["-3"]]);

  for (const [command, args] of candidates) {
    const version = pythonVersion(command, args);
    if (version && isNewEnough(version)) return { command, args, version };
  }
  return null;
}

if (process.env.AURASHADER_SKIP_BACKEND === "1") {
  log("AURASHADER_SKIP_BACKEND is set, skipping the Python backend");
  process.exit(0);
}

// A venv stops working if the folder was moved or its Python was removed
if (existsSync(VENV_DIR) && !pythonVersion(venvPython())) {
  log("fastapi/.venv is broken (moved folder?), rebuilding it");
  rmSync(VENV_DIR, { recursive: true, force: true });
}

if (!existsSync(VENV_DIR)) {
  const python = findPython();
  if (!python) {
    log(`Python ${MIN_PYTHON.join(".")}+ wasn't found, so the backend isn't set up yet.`);
    log("Install it from https://www.python.org/downloads/ and then run: npm run setup");
    process.exit(0);
  }
  log(`creating fastapi/.venv with Python ${python.version.join(".")}`);
  const venv = spawnSync(python.command, [...python.args, "-m", "venv", VENV_DIR], {
    stdio: "inherit",
  });
  if (venv.status !== 0) fail("couldn't create fastapi/.venv, see the error above");
}

log("installing the backend's Python packages (the first time takes a minute)");
const pip = spawnSync(
  venvPython(),
  [
    "-m",
    "pip",
    "install",
    "--quiet",
    "--disable-pip-version-check",
    "-r",
    path.join(BACKEND_DIR, "requirements.txt"),
  ],
  { stdio: "inherit" }
);
if (pip.status !== 0) fail("pip install failed, see the error above");

if (!existsSync(ENV_FILE)) {
  copyFileSync(path.join(BACKEND_DIR, ".env.example"), ENV_FILE);
  log("created fastapi/.env");
}

log(
  hasApiKey()
    ? "all set. Start everything with: npm run dev"
    : "all set. Paste your Anthropic API key into fastapi/.env, then run: npm run dev"
);
