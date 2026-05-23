import * as fs from "fs";
import * as path from "path";

export interface SkillInfo {
  name: string;
  description: string;
}

export function searchSkills(projectPath: string, query: string): SkillInfo[] {
  const skillsDir = path.join(projectPath, ".agents", "skills");
  if (!fs.existsSync(skillsDir)) return [];

  const results: SkillInfo[] = [];

  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name.startsWith("_")) continue;

      const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
      if (!fs.existsSync(skillFile)) continue;

      if (!entry.name.startsWith(query)) continue;

      const content = fs.readFileSync(skillFile, "utf-8");
      const frontmatter = parseFrontmatter(content);
      results.push({
        name: frontmatter.name || entry.name,
        description: frontmatter.description || "",
      });
    }
  } catch {
    // ignore
  }

  return results;
}

function parseFrontmatter(content: string): { name: string; description: string } {
  const cleaned = content.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { name: "", description: "" };

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return { name: "", description: "" };

  let name = "";
  let description = "";

  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();

    if (key === "name" && value.length > 0) {
      name = value;
    } else if (key === "description" && value.length > 0) {
      description = value;
    }
  }

  return { name, description };
}

export function resolveSkill(projectPath: string, skillName: string): string | null {
  const skillFile = path.join(projectPath, ".agents", "skills", skillName, "SKILL.md");
  if (!fs.existsSync(skillFile)) return null;

  try {
    return fs.readFileSync(skillFile, "utf-8");
  } catch {
    return null;
  }
}

export function parseSkillReferences(content: string): { skillNames: string[]; cleanContent: string } {
  const skillRegex = /#[a-zA-Z0-9_-]+/g;
  const skillNames: string[] = [];
  let cleanContent = content;

  let match: RegExpExecArray | null;
  while ((match = skillRegex.exec(content)) !== null) {
    skillNames.push(match[0].substring(1));
    cleanContent = cleanContent.replace(match[0], "");
  }

  cleanContent = cleanContent.replace(/\s+/g, " ").trim();

  return { skillNames, cleanContent };
}
