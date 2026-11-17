import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError, notFound } from './errors';

/** POST, PUT y PATCH solo aceptan JSON: cualquier otra cosa es 415. */
export const requireJson: RequestHandler = (req, _res, next) => {
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method);
  if (hasBody && !req.is('application/json')) {
    return next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'El cuerpo debe ser JSON (Content-Type: application/json)'));
  }
  next();
};

export const routeNotFound: RequestHandler = (req, _res, next) => {
  next(notFound(`No existe la ruta ${req.method} ${req.path}`));
};

/** Traduce cualquier error a una respuesta JSON con el mismo formato: { error: { code, message, details? } }. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let error: HttpError;

  if (err instanceof HttpError) {
    error = err;
  } else if (err instanceof ZodError) {
    error = new HttpError(
      400,
      'VALIDATION_ERROR',
      'Los datos enviados no son válidos',
      err.issues.map((issue) => ({ field: issue.path.join('.') || null, message: issue.message })),
    );
  } else if (err?.type === 'entity.parse.failed') {
    error = new HttpError(400, 'INVALID_JSON', 'El cuerpo no es un JSON válido');
  } else if (err?.type === 'entity.too.large') {
    error = new HttpError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo es demasiado grande');
  } else {
    console.error(err);
    error = new HttpError(500, 'INTERNAL_ERROR', 'Error interno del servidor');
  }

  res.status(error.status).json({
    error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
  });
};
