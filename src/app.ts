import express from 'express';
import type { Database } from 'better-sqlite3';
import { errorHandler, requireJson, routeNotFound } from './middleware';
import { TaskRepository } from './tasks/task.repository';
import { taskRouter } from './tasks/task.routes';

/** Construye la app a partir de una base de datos ya migrada (así los tests pueden usar una en memoria). */
export function createApp(db: Database) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requireJson);
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/tasks', taskRouter(new TaskRepository(db)));

  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
}
