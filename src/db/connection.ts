import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

/**
 * Abre la base de datos SQLite. Con ':memory:' crea una base en memoria
 * (la usan los tests para que cada uno empiece limpio).
 */
export function openDatabase(file: string): Database.Database {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
