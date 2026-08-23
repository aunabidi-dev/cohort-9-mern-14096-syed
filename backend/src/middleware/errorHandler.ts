import type { NextFunction, Request, Response } from 'express';
import type { ErrorResponse } from '../types/error';
import { AppError } from '../types/error';
import { logger } from '../utils/logger';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const reqLogger = req.log ?? logger;

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      reqLogger.error({ err: error }, error.message || 'Server error');
    }
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  // Handle body-parser malformed JSON errors
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400 &&
    'body' in error
  ) {
    res.status(400).json({ message: 'Invalid JSON payload' });
    return;
  }

  // Handle generic client errors with 4xx status
  if (
    typeof error === 'object' &&
    error !== null &&
    ('status' in error || 'statusCode' in error)
  ) {
    const status = Number(
      (error as { status?: number; statusCode?: number }).status ??
        (error as { status?: number; statusCode?: number }).statusCode,
    );

    if (status >= 400 && status < 500) {
      const message =
        (error as { message?: string }).message || 'Bad request';
      res.status(status).json({ message });
      return;
    }
  }

  reqLogger.error({ err: error }, 'Unhandled server error');
  res.status(500).json({ message: 'Internal server error' });
}

