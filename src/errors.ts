/** Error con código HTTP que el middleware de errores convierte en respuesta JSON. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (message = 'Recurso no encontrado') =>
  new HttpError(404, 'NOT_FOUND', message);
