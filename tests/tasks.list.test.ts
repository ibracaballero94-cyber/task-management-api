import { beforeEach, describe, expect, it } from 'vitest';
import { type Api, buildTestApp, titles } from './helpers';

describe('Listado con filtros y paginación', () => {
  let api: Api;

  beforeEach(async () => {
    api = buildTestApp();
    const tasks = [
      { title: 'A', assignee: 'Ana', status: 'pending', dueDate: '2026-12-03' },
      { title: 'B', assignee: 'Ana', status: 'done', dueDate: '2026-12-01' },
      { title: 'C', assignee: 'Luis', status: 'pending' },
      { title: 'D', assignee: 'ana', status: 'in_progress', dueDate: '2026-12-02' },
      { title: 'E', assignee: 'Luis', status: 'pending', dueDate: '2026-11-30' },
    ];
    for (const task of tasks) await api.post('/tasks').send(task).expect(201);
  });

  it('ordena por fecha límite (sin fecha al final) y pagina', async () => {
    const page1 = await api.get('/tasks?limit=2&page=1').expect(200);
    expect(titles(page1.body)).toEqual(['E', 'B']);
    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });

    const page3 = await api.get('/tasks?limit=2&page=3').expect(200);
    expect(titles(page3.body)).toEqual(['C']);

    const beyond = await api.get('/tasks?limit=2&page=9').expect(200);
    expect(beyond.body.data).toEqual([]);
  });

  it('filtra por estado, por responsable (sin distinguir mayúsculas) y por ambos', async () => {
    const pending = await api.get('/tasks?status=pending').expect(200);
    expect(pending.body.meta.total).toBe(3);

    const ana = await api.get('/tasks?assignee=ANA').expect(200);
    expect(titles(ana.body)).toEqual(['B', 'D', 'A']);

    const both = await api.get('/tasks?assignee=luis&status=pending').expect(200);
    expect(titles(both.body)).toEqual(['E', 'C']);
  });

  it('rechaza con 400 filtros o paginación inválidos', async () => {
    await api.get('/tasks?status=archived').expect(400);
    await api.get('/tasks?page=0').expect(400);
    await api.get('/tasks?limit=500').expect(400);
    await api.get('/tasks?colour=red').expect(400);
  });
});
