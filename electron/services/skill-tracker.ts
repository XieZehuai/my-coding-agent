interface TrackedSkill {
  name: string;
  content: string;
}

const conversationSkills = new Map<string, TrackedSkill[]>();

export const skillTracker = {
  add(convId: string, name: string, content: string) {
    const skills = conversationSkills.get(convId) || [];
    if (skills.some((s) => s.name === name)) return;
    skills.push({ name, content });
    conversationSkills.set(convId, skills);
  },

  get(convId: string): TrackedSkill[] {
    return conversationSkills.get(convId) || [];
  },

  clear(convId: string) {
    conversationSkills.delete(convId);
  },
};
