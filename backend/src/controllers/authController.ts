import type { Request, Response } from 'express';
import * as authService from '../services/authService';
import type {
  AuthResult,
  LoginInput,
  RegisterInput,
} from '../services/authService';

export async function register(
  req: Request<unknown, AuthResult, RegisterInput>,
  res: Response<AuthResult>,
): Promise<void> {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(
  req: Request<unknown, AuthResult, LoginInput>,
  res: Response<AuthResult>,
): Promise<void> {
  const result = await authService.login(req.body);
  res.status(200).json(result);
}
