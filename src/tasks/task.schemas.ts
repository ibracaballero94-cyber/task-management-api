import { z } from 'zod';

// Mensajes de error de zod en español.
z.config(z.locales.es());

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const;
export const statusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof statusSchema>;

/** Comprueba que la fecha existe de verdad (rechaza 2026-02-30, por ejemplo). */
const isRealDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe tener el formato YYYY-MM-DD')
  .refine(isRealDate, 'No es una fecha válida');

const title = z.string().trim().min(1, 'El título es obligatorio').max(200);
const description = z.string().trim().max(2000);
const assignee = z.string().trim().min(1, 'El responsable es obligatorio').max(100);

export const createTaskSchema = z.strictObject({
  title,
  description: description.default(''),
  status: statusSchema.default('pending'),
  assignee,
  dueDate: dueDateSchema.nullable().default(null),
});

export const updateTaskSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    status: statusSchema.optional(),
    assignee: assignee.optional(),
    dueDate: dueDateSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Hay que enviar al menos un campo');

export const listTasksQuerySchema = z.strictObject({
  status: statusSchema.optional(),
  assignee: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const taskParamsSchema = z.object({ id: z.coerce.number().int().positive() });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
