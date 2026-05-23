import * as fs from "fs";
import * as path from "path";

export function listDirectory(
  dirPath: string,
  basePath: string,
  maxDepth: number = 3,
  maxEntries: number = 100
): string {
  const lines: string[] = [];
  const relPath = path.relative(basePath, dirPath).replace(/\\/g, "/") || ".";
  let entryCount = 0;

  function walk(dir: string, prefix: string, depth: number) {
    if (depth > maxDepth || entryCount >= maxEntries) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      lines.push(`${prefix}[unreadable]`);
      return;
    }

    entries = entries
      .filter((e) => !e.name.startsWith(".") || e.name === ".agents")
      .filter((e) => e.name !== "node_modules")
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    for (let i = 0; i < entries.length; i++) {
      if (entryCount >= maxEntries) {
        lines.push(`${prefix}... (${entries.length - i} more entries)`);
        return;
      }
      const entry = entries[i];
      const isLast = i === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const childPrefix = prefix + (isLast ? "    " : "│   ");

      entryCount++;
      if (entry.isDirectory()) {
        lines.push(`${prefix}${connector}${entry.name}/`);
        walk(path.join(dir, entry.name), childPrefix, depth + 1);
      } else {
        lines.push(`${prefix}${connector}${entry.name}`);
      }
    }
  }

  walk(dirPath, "", 0);
  return `${relPath}/\n${lines.join("\n")}`;
}

export function searchFiles(projectPath: string, query: string): string[] {
  if (!query || query.length < 1) return [];

  const results: string[] = [];
  const searchQuery = query.toLowerCase();

  function walk(dir: string, baseDir: string, depth = 0) {
    if (depth > 5 || results.length >= 20) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".agents") continue;
      if (entry.name === "node_modules") continue;

      const relativePath = path.relative(baseDir, path.join(dir, entry.name)).replace(/\\/g, "/");

      if (relativePath.toLowerCase().includes(searchQuery)) {
        results.push(relativePath + (entry.isDirectory() ? "/" : ""));
      }

      if (entry.isDirectory() && depth < 5) {
        walk(path.join(dir, entry.name), baseDir, depth + 1);
      }
    }
  }

  walk(projectPath, projectPath);
  return results.slice(0, 20);
}
