import { describe, expect, it } from 'vitest';
import { openDatabase } from '../src/db/connection';
import { migrate } from '../src/db/migrate';

describe('Migraciones', () => {
  it('aplica todas las migraciones una sola vez', () => {
    const db = openDatabase(':memory:');

    expect(migrate(db)).toEqual(['001_create_tasks.sql', '002_add_task_filter_indexes.sql']);
    expect(migrate(db)).toEqual([]);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck().all();
    expect(tables).toEqual(expect.arrayContaining(['tasks', 'schema_migrations']));
  });

  it('la tabla rechaza estados no válidos aunque alguien se salte la API', () => {
    const db = openDatabase(':memory:');
    migrate(db);
    const insert = db.prepare("INSERT INTO tasks (title, assignee, status) VALUES ('X', 'Ana', ?)");

    expect(() => insert.run('archived')).toThrow(/CHECK constraint failed/);
  });
});
