import type { NextFunction, Request, Response } from 'express';
import type { ErrorResponse } from '../types/error';
import { AppError } from '../types/error';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
}
