import { beforeEach, describe, expect, it } from 'vitest';
import { type Api, buildTestApp, validTask } from './helpers';

describe('CRUD de tareas', () => {
  let api: Api;
  beforeEach(() => {
    api = buildTestApp();
  });

  it('crea una tarea con valores por defecto y devuelve 201 con Location', async () => {
    const res = await api.post('/tasks').send({ title: 'Llamar al cliente', assignee: 'Luis' });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/tasks/${res.body.id}`);
    expect(res.body).toMatchObject({
      title: 'Llamar al cliente',
      description: '',
      status: 'pending',
      assignee: 'Luis',
      dueDate: null,
    });
  });

  it('recorre el ciclo completo: crear, ver, editar y borrar', async () => {
    const { body: created } = await api.post('/tasks').send(validTask).expect(201);

    const shown = await api.get(`/tasks/${created.id}`).expect(200);
    expect(shown.body).toEqual(created);

    const edited = await api.patch(`/tasks/${created.id}`).send({ status: 'done', dueDate: null }).expect(200);
    expect(edited.body).toMatchObject({ ...validTask, status: 'done', dueDate: null });

    await api.delete(`/tasks/${created.id}`).expect(204);
    await api.get(`/tasks/${created.id}`).expect(404);
  });

  it('devuelve 404 al ver, editar o borrar una tarea que no existe', async () => {
    const responses = [
      await api.get('/tasks/999'),
      await api.patch('/tasks/999').send({ title: 'Nuevo' }),
      await api.delete('/tasks/999'),
    ];
    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });
});
