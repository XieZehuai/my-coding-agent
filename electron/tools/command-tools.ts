import { spawn } from "child_process";
import * as path from "path";

function runCommand(command: string, projectPath: string, timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("powershell.exe", ["-NoProfile", "-Command", command], {
      cwd: projectPath,
      env: { ...process.env },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
      reject(new Error(`Command timed out after ${timeout / 1000}s: ${command}`));
    }, timeout);

    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return;
      const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : "");
      resolve(output.trim() || `Command exited with code ${code}`);
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to execute command: ${err.message}`));
    });
  });
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  projectPath: string
): Promise<string> {
  if (toolName === "run_command") {
    const command = args.command as string;
    if (!command) throw new Error("Command is required");
    return runCommand(command, projectPath);
  }
  throw new Error(`Unknown command tool: ${toolName}`);
}
