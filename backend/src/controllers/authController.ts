import type { Request, Response } from 'express';
import * as authService from '../services/authService';
import type { AuthResult } from '../services/authService';

export async function register(
  req: Request,
  res: Response<AuthResult>,
): Promise<void> {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(
  req: Request,
  res: Response<AuthResult>,
): Promise<void> {
  const result = await authService.login(req.body);
  res.status(200).json(result);
}
