import request from 'supertest';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db/connection';
import { migrate } from '../src/db/migrate';

/** App con una base de datos SQLite en memoria recién migrada: cada test empieza limpio. */
export function buildTestApp() {
  const db = openDatabase(':memory:');
  migrate(db);
  return request(createApp(db));
}

export type Api = ReturnType<typeof buildTestApp>;

export const validTask = {
  title: 'Preparar la demo',
  description: 'Diapositivas y entorno de pruebas',
  assignee: 'Ana',
  dueDate: '2026-12-01',
};

export const titles = (body: { data: { title: string }[] }) => body.data.map((task) => task.title);
