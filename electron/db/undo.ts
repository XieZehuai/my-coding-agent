import { getDb } from "./connection";

export interface UndoState {
  convId: string;
  createdFiles: string;
  modifiedFiles: string;
}

export function saveUndoState(convId: string, createdFiles: string[], modifiedFiles: string[]): void {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO conversation_undo (conv_id, created_files, modified_files)
    VALUES (?, ?, ?)
    ON CONFLICT(conv_id) DO UPDATE SET
      created_files = excluded.created_files,
      modified_files = excluded.modified_files
  `
  ).run(convId, JSON.stringify(createdFiles), JSON.stringify(modifiedFiles));
}

export function getUndoState(convId: string): UndoState | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT conv_id as convId, created_files as createdFiles, modified_files as modifiedFiles FROM conversation_undo WHERE conv_id = ?"
    )
    .get(convId) as UndoState | undefined;
}

export function clearUndoState(convId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM conversation_undo WHERE conv_id = ?").run(convId);
}

import Database from "better-sqlite3";

export function initUndoSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_undo (
      conv_id TEXT PRIMARY KEY,
      created_files TEXT NOT NULL DEFAULT '[]',
      modified_files TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (conv_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);
}
