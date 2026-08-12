import type { PublicUser } from '../models/user';
import {
  createUser,
  findUserByEmail,
  toPublicUser,
} from '../models/user';
import { AppError } from '../types/error';
import {
  generateToken,
  hashPassword,
  verifyPassword,
} from '../utils/auth';

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export interface RegisterInput {
  name?: string;
  email?: string;
  password?: string;
}

export interface LoginInput {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): void {
  if (!EMAIL_PATTERN.test(email)) {
    throw new AppError(400, 'Invalid email format');
  }
}

function isDuplicateEntryError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ER_DUP_ENTRY'
  );
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password;

  if (!name || !email || !password) {
    throw new AppError(400, 'Name, email, and password are required');
  }

  validateEmail(email);

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new AppError(409, 'Email is already registered');
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await createUser(name, email, passwordHash);
    const token = generateToken({ userId: user.id, email: user.email });

    return {
      user: toPublicUser(user),
      token,
    };
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      throw new AppError(409, 'Email is already registered');
    }

    throw new AppError(500, 'Unable to register user');
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const email = input.email?.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    throw new AppError(400, 'Email and password are required');
  }

  validateEmail(email);

  const user = await findUserByEmail(email);

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const isValidPassword = await verifyPassword(password, user.password);

  if (!isValidPassword) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = generateToken({ userId: user.id, email: user.email });

  return {
    user: toPublicUser(user),
    token,
  };
}
