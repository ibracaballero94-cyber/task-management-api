import { Router } from 'express';
import { notFound } from '../errors';
import type { TaskRepository } from './task.repository';
import { createTaskSchema, listTasksQuerySchema, taskParamsSchema, updateTaskSchema } from './task.schemas';

export function taskRouter(tasks: TaskRepository): Router {
  const router = Router();

  router.post('/', (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = tasks.create(input);
    res.status(201).location(`${req.baseUrl}/${task.id}`).json(task);
  });

  router.get('/', (req, res) => {
    res.json(tasks.list(listTasksQuerySchema.parse(req.query)));
  });

  router.get('/:id', (req, res) => {
    const task = tasks.findById(taskParamsSchema.parse(req.params).id);
    if (!task) throw notFound('La tarea no existe');
    res.json(task);
  });

  router.patch('/:id', (req, res) => {
    const id = taskParamsSchema.parse(req.params).id;
    const task = tasks.update(id, updateTaskSchema.parse(req.body));
    if (!task) throw notFound('La tarea no existe');
    res.json(task);
  });

  router.delete('/:id', (req, res) => {
    if (!tasks.delete(taskParamsSchema.parse(req.params).id)) throw notFound('La tarea no existe');
    res.status(204).end();
  });

  return router;
}
