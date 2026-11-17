import { beforeEach, describe, expect, it } from 'vitest';
import { type Api, buildTestApp, validTask } from './helpers';

describe('Validación y errores', () => {
  let api: Api;
  beforeEach(() => {
    api = buildTestApp();
  });

  it('rechaza con 400 una tarea inválida e indica cada campo erróneo', async () => {
    const res = await api
      .post('/tasks')
      .send({ title: '   ', status: 'archived', assignee: 'Ana', dueDate: '2026-02-30' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((detail: { field: string }) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'status', 'dueDate']));
  });

  it('rechaza campos desconocidos y un PATCH vacío', async () => {
    const { body } = await api.post('/tasks').send(validTask).expect(201);

    await api.post('/tasks').send({ ...validTask, priority: 'high' }).expect(400);
    await api.patch(`/tasks/${body.id}`).send({}).expect(400);
  });

  it('distingue JSON mal formado (400), cuerpo que no es JSON (415) e id no numérico (400)', async () => {
    const malformed = await api.post('/tasks').set('Content-Type', 'application/json').send('{"title":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');

    const notJson = await api.post('/tasks').type('form').send('title=Hola');
    expect(notJson.status).toBe(415);

    const badId = await api.get('/tasks/abc');
    expect(badId.status).toBe(400);
    expect(badId.body.error.details[0].field).toBe('id');
  });
});
