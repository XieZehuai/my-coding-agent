import { getDb } from "./connection";

export function saveConversationSkill(convId: string, name: string): void {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO conversation_skills (conv_id, name, added_at) VALUES (?, ?, ?)"
  ).run(convId, name, Date.now());
}

export function getConversationSkillNames(convId: string): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT name FROM conversation_skills WHERE conv_id = ? ORDER BY added_at ASC")
    .all(convId) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

export function deleteConversationSkills(convId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM conversation_skills WHERE conv_id = ?").run(convId);
}
