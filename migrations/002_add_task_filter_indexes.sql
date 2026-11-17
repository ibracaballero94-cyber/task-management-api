-- Índices para los filtros del listado (estado y responsable) y para su orden por fecha límite.
-- El de responsable usa NOCASE porque el filtro no distingue mayúsculas.
CREATE INDEX idx_tasks_status_due_date ON tasks (status, due_date);
CREATE INDEX idx_tasks_assignee_due_date ON tasks (assignee COLLATE NOCASE, due_date);
