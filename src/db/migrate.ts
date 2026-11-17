import fs from 'node:fs';
import path from 'node:path';
import type { Database } from 'better-sqlite3';

/** Carpeta de migraciones: funciona igual desde src/ (tsx) que desde dist/ (node). */
export const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

/**
 * Aplica, en orden, los ficheros .sql de la carpeta de migraciones que aún no
 * estén registrados en la tabla schema_migrations. Cada migración va en su propia
 * transacción: si falla, no queda a medias ni se marca como aplicada.
 * Devuelve los nombres de las migraciones aplicadas en esta ejecución.
 */
export function migrate(db: Database, dir: string = MIGRATIONS_DIR): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').pluck().all() as string[],
  );
  const pending = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.sql') && !applied.has(file))
    .sort();

  const register = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');
  for (const file of pending) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      register.run(file);
    })();
  }
  return pending;
}
