-- Tabla principal de tareas.
-- Las fechas se guardan como texto ISO 8601 (SQLite no tiene tipo fecha).
CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description TEXT    NOT NULL DEFAULT '',
  status      TEXT    NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_progress', 'done')),
  assignee    TEXT    NOT NULL CHECK (length(assignee) BETWEEN 1 AND 100),
  due_date    TEXT    CHECK (due_date IS NULL OR date(due_date) = due_date),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
