import * as fs from "fs";
import * as path from "path";
import { DEFAULT_CONFIG } from "../../shared/types";

export interface CommandResult {
  type: "builtin" | "custom" | "not_found";
  builtinResult?: string;
  customPrompt?: string;
  customName?: string;
}

const BUILTIN_COMMANDS: Record<string, (projectPath: string) => string> = {
  config: runConfigCommand,
};

export function resolveCommand(projectPath: string, userInput: string): CommandResult | null {
  const trimmed = userInput.trim();
  if (!trimmed.startsWith("/")) return null;

  const spaceIdx = trimmed.indexOf(" ");
  const command = spaceIdx > 0 ? trimmed.substring(1, spaceIdx) : trimmed.substring(1);
  if (!command) return null;

  // Check built-in commands
  if (BUILTIN_COMMANDS[command]) {
    const result = BUILTIN_COMMANDS[command](projectPath);
    return { type: "builtin", builtinResult: result };
  }

  // Check custom commands
  const cmdDir = path.join(projectPath, ".agents", "commands", command);
  const cmdFile = path.join(cmdDir, "COMMAND.md");

  if (fs.existsSync(cmdFile)) {
    const prompt = fs.readFileSync(cmdFile, "utf-8").trim();
    return { type: "custom", customPrompt: prompt, customName: command };
  }

  return { type: "not_found" };
}

export function searchCommands(projectPath: string, query: string): string[] {
  const results: string[] = [];

  // Built-in commands
  for (const name of Object.keys(BUILTIN_COMMANDS)) {
    if (name.startsWith(query)) {
      results.push(`/${name}`);
    }
  }

  // Custom commands
  const commandsDir = path.join(projectPath, ".agents", "commands");
  if (fs.existsSync(commandsDir)) {
    try {
      const entries = fs.readdirSync(commandsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
        if (entry.name.startsWith(query)) {
          results.push(`/${entry.name}`);
        }
      }
    } catch {
      // ignore
    }
  }

  return results;
}

// ============================================================
// Built-in: /config
// ============================================================

function runConfigCommand(projectPath: string): string {
  const agentsDir = path.join(projectPath, ".agents");
  const configPath = path.join(agentsDir, "config.toml");

  // Ensure .agents directory exists
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  if (!fs.existsSync(configPath)) {
    // Create new config with defaults
    const content = generateDefaultConfig();
    fs.writeFileSync(configPath, content, "utf-8");
    return `已创建 .agents/config.toml，包含默认配置。\n\n\`\`\`toml\n${content}\`\`\``;
  }

  // Config exists — merge missing keys
  const existing = fs.readFileSync(configPath, "utf-8");
  const missing = getMissingKeys(existing);
  if (missing.length === 0) {
    return "config.toml 已存在且配置完整，无需更新。";
  }

  const appended = "\n\n" + missing.join("\n");
  fs.appendFileSync(configPath, appended, "utf-8");
  return `已更新 config.toml，追加了以下缺失配置：\n\n\`\`\`toml\n${appended.trim()}\`\`\``;
}

function generateDefaultConfig(): string {
  return `[api]
base_url = "${DEFAULT_CONFIG.api.baseUrl}"
api_key = "env:DEEPSEEK_API_KEY"
model = "${DEFAULT_CONFIG.api.model}"
retry = ${DEFAULT_CONFIG.api.retry}

[permissions]
read = "always"
write = "ask"
execute = "ask"

max_turns = ${DEFAULT_CONFIG.maxTurns}
`;
}

function getMissingKeys(existing: string): string[] {
  const defaults: Record<string, string[]> = {
    "[api]": [
      `base_url = "${DEFAULT_CONFIG.api.baseUrl}"`,
      `api_key = "env:DEEPSEEK_API_KEY"`,
      `model = "${DEFAULT_CONFIG.api.model}"`,
      `retry = ${DEFAULT_CONFIG.api.retry}`,
    ],
    "[permissions]": ['read = "always"', 'write = "ask"', 'execute = "ask"'],
  };

  const globalDefaults = [`max_turns = ${DEFAULT_CONFIG.maxTurns}`];

  const missing: string[] = [];

  for (const [section, keys] of Object.entries(defaults)) {
    if (!existing.includes(section)) {
      missing.push(section, ...keys, "");
      continue;
    }
    for (const key of keys) {
      const keyName = key.split(" = ")[0];
      if (!existing.includes(keyName)) {
        missing.push(key);
      }
    }
  }

  for (const key of globalDefaults) {
    const keyName = key.split(" = ")[0];
    if (!existing.includes(keyName)) {
      missing.push(key);
    }
  }

  return missing;
}
