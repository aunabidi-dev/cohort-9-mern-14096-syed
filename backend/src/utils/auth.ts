import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AppError } from '../types/error';

const SALT_ROUNDS = 10;

export interface JwtPayload {
  userId: number;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function generateToken(payload: JwtPayload): string {
  if (!config.jwt.secret) {
    throw new AppError(500, 'JWT configuration is incomplete');
  }

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  if (!config.jwt.secret) {
    throw new AppError(500, 'JWT configuration is incomplete');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('userId' in decoded) ||
      !('email' in decoded)
    ) {
      throw new AppError(401, 'Invalid or expired token');
    }

    return {
      userId: Number(decoded.userId),
      email: String(decoded.email),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, 'Invalid or expired token');
  }
}
