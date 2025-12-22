import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

function isWin() { return process.platform === "win32"; }

export async function ensurePythonVenv(projectRoot: string): Promise<string> {
  const venvDir = path.join(projectRoot, ".pyenv");
  const pyBin = path.join(venvDir, isWin() ? "Scripts" : "bin", isWin() ? "python.exe" : "python");

  // If USE_GLOBAL_PYTHON is set, skip venv logic entirely
  if (process.env.USE_GLOBAL_PYTHON === "true") {
    console.log("[API] Using global Python as requested.");
    return process.env.PYTHON_PATH || (isWin() ? "python" : "python3");
  }

  try {
    await fs.access(pyBin);
    // Venv exists - check if we've already done initial setup
    const setupFlagPath = path.join(venvDir, "setup_complete.flag");
    try {
      await fs.access(setupFlagPath);
      return pyBin; // Setup already complete
    } catch {
      // Venv exists but setup might be incomplete, proceed to pip install
      console.log("[API] Venv found but setup flag missing. Completing setup...");
    }
  } catch {
    // Create venv if it doesn't exist
    console.log("[API] Creating fresh Python virtual environment...");
    const sysPython = process.env.PYTHON_PATH || (isWin() ? "python" : "python3");
    await new Promise<void>((resolve, reject) => {
      const p = spawn(sysPython, ["-m", "venv", venvDir]);
      let err = "";
      p.stderr.on("data", d => err += d.toString());
      p.on("close", code => code === 0 ? resolve() : reject(new Error(`venv create failed: ${err}`)));
    });
  }

  // Install dependencies
  const reqPath = path.join(projectRoot, "python", "requirements.txt");
  console.log("[API] Installing Python dependencies (Initial Setup)...");
  await new Promise<void>((resolve, reject) => {
    const p = spawn(pyBin, ["-m", "pip", "install", "-r", reqPath]);
    p.on("close", code => code === 0 ? resolve() : reject(new Error("pip install failed")));
  });

  // Create a flag to mark setup as complete
  const setupFlagPath = path.join(venvDir, "setup_complete.flag");
  await fs.writeFile(setupFlagPath, new Date().toISOString());

  return pyBin;
}

export async function runPython(pyBin: string, scriptPath: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(pyBin, [scriptPath, ...args]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", d => stdout += d.toString());
    proc.stderr.on("data", d => stderr += d.toString());
    proc.on("close", code => resolve({ stdout, stderr, code: code ?? 1 }));
  });
}
