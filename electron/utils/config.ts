import * as fs from "fs";
import * as path from "path";
import * as toml from "smol-toml";
import { AppConfig, DEFAULT_CONFIG, ApiConfig, PermissionConfig, PermissionLevel } from "../../shared/types";

function resolveEnv(value: string): string {
  if (value.startsWith("env:")) {
    const envName = value.slice(4);
    const envValue = process.env[envName];
    if (!envValue) {
      throw new Error(`Environment variable "${envName}" is not set (required by config).`);
    }
    return envValue;
  }
  return value;
}

function validateRetry(retry: number): number {
  if (typeof retry !== "number" || isNaN(retry)) return DEFAULT_CONFIG.api.retry;
  if (retry <= 0) return 0;
  if (retry > 5) return 5;
  return retry;
}

function validatePermission(value: unknown): PermissionLevel {
  if (value === "always" || value === "ask" || value === "deny") {
    return value;
  }
  throw new Error(`Invalid permission value: "${value}". Must be "always", "ask", or "deny".`);
}

export function readConfig(projectPath: string): AppConfig {
  const configPath = path.join(projectPath, ".agents", "config.toml");

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = fs.readFileSync(configPath, "utf-8");

  // Empty config — use defaults
  if (!raw.trim()) {
    return { ...DEFAULT_CONFIG };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = toml.parse(raw) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Failed to parse .agents/config.toml: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }

  const apiSection = (parsed.api as Record<string, unknown>) || {};
  const permSection = (parsed.permissions as Record<string, unknown>) || {};
  const agentSection = (parsed.agent as Record<string, unknown>) || {};

  const maxTurnsRaw = Number(agentSection.max_turns);
  const maxTurns = Number.isFinite(maxTurnsRaw) && maxTurnsRaw >= 1 ? maxTurnsRaw : DEFAULT_CONFIG.maxTurns;

  const api: ApiConfig = {
    baseUrl: (apiSection.base_url as string) || DEFAULT_CONFIG.api.baseUrl,
    apiKey: apiSection.api_key ? resolveEnv(apiSection.api_key as string) : DEFAULT_CONFIG.api.apiKey,
    model: (apiSection.model as string) || DEFAULT_CONFIG.api.model,
    retry: validateRetry(Number(apiSection.retry)),
  };

  const permissions: PermissionConfig = {
    read: permSection.read ? validatePermission(permSection.read) : DEFAULT_CONFIG.permissions.read,
    write: permSection.write ? validatePermission(permSection.write) : DEFAULT_CONFIG.permissions.write,
    execute: permSection.execute ? validatePermission(permSection.execute) : DEFAULT_CONFIG.permissions.execute,
  };

  return { api, permissions, maxTurns };
}

export function resolveConfigValue(value: string): string {
  return resolveEnv(value);
}
