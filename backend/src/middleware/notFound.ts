import type { Request, Response } from 'express';
import type { ErrorResponse } from '../types/error';

export function notFound(
  _req: Request,
  res: Response<ErrorResponse>,
): void {
  res.status(404).json({ message: 'Route not found' });
}
