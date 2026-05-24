import { saveConversationSkill, getConversationSkillNames, deleteConversationSkills } from "../db/skills";
import { resolveSkill } from "./skill-service";

interface TrackedSkill {
  name: string;
  content: string;
}

const conversationSkills = new Map<string, TrackedSkill[]>();

export const skillTracker = {
  add(convId: string, name: string) {
    const skills = conversationSkills.get(convId) || [];
    if (skills.some((s) => s.name === name)) return;
    skills.push({ name, content: "" });
    conversationSkills.set(convId, skills);
    saveConversationSkill(convId, name);
  },

  get(convId: string, projectPath: string): TrackedSkill[] {
    let skills = conversationSkills.get(convId);
    if (!skills) {
      const names = getConversationSkillNames(convId);
      if (names.length > 0) {
        skills = names.map((name) => ({ name, content: "" }));
        conversationSkills.set(convId, skills);
      } else {
        return [];
      }
    }
    for (const s of skills) {
      if (!s.content) {
        const content = resolveSkill(projectPath, s.name);
        s.content = content || "";
      }
    }
    return skills;
  },

  clear(convId: string) {
    conversationSkills.delete(convId);
    deleteConversationSkills(convId);
  },
};
