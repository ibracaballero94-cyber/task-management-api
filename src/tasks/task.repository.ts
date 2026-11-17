import type { Database } from 'better-sqlite3';
import type { CreateTaskInput, ListTasksQuery, Task, TaskStatus, UpdateTaskInput } from './task.schemas';

interface TaskRow {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  assignee: row.assignee,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Campos editables de la API -> columna en la tabla (lista blanca para el UPDATE dinámico). */
const COLUMNS: Record<keyof UpdateTaskInput, string> = {
  title: 'title',
  description: 'description',
  status: 'status',
  assignee: 'assignee',
  dueDate: 'due_date',
};

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export class TaskRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateTaskInput): Task {
    const row = this.db
      .prepare(
        `INSERT INTO tasks (title, description, status, assignee, due_date)
         VALUES (@title, @description, @status, @assignee, @dueDate)
         RETURNING *`,
      )
      .get(input) as TaskRow;
    return toTask(row);
  }

  findById(id: number): Task | undefined {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row && toTask(row);
  }

  /** Lista paginada. Primero las de fecha límite más cercana; las que no tienen fecha, al final. */
  list({ status, assignee, page, limit }: ListTasksQuery): Page<Task> {
    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (status) {
      where.push('status = @status');
      params.status = status;
    }
    if (assignee) {
      where.push('assignee = @assignee COLLATE NOCASE');
      params.assignee = assignee;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = this.db.prepare(`SELECT COUNT(*) FROM tasks ${whereSql}`).pluck().get(params) as number;
    const rows = this.db
      .prepare(
        `SELECT * FROM tasks ${whereSql}
         ORDER BY due_date IS NULL, due_date, id
         LIMIT @limit OFFSET @offset`,
      )
      .all({ ...params, limit, offset: (page - 1) * limit }) as TaskRow[];

    return {
      data: rows.map(toTask),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Actualiza solo los campos recibidos. Devuelve undefined si la tarea no existe. */
  update(id: number, changes: UpdateTaskInput): Task | undefined {
    const fields = (Object.keys(changes) as (keyof UpdateTaskInput)[]).filter(
      (key) => changes[key] !== undefined,
    );
    const set = fields.map((key) => `${COLUMNS[key]} = @${key}`);
    set.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`);

    const row = this.db
      .prepare(`UPDATE tasks SET ${set.join(', ')} WHERE id = @id RETURNING *`)
      .get({ ...Object.fromEntries(fields.map((key) => [key, changes[key]])), id }) as TaskRow | undefined;
    return row && toTask(row);
  }

  /** Devuelve true si había una tarea que borrar. */
  delete(id: number): boolean {
    return this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0;
  }
}
