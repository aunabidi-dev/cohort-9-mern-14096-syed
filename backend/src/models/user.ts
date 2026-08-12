import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from '../config/database';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

interface UserRow extends RowDataPacket, User {}

const USERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`;

export async function initializeUsersTable(): Promise<void> {
  await getPool().execute(USERS_TABLE_SQL);
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await getPool().execute<UserRow[]>(
    'SELECT id, name, email, password, created_at, updated_at FROM users WHERE email = ?',
    [email],
  );

  return rows[0] ?? null;
}

export async function findUserById(id: number): Promise<User | null> {
  const [rows] = await getPool().execute<UserRow[]>(
    'SELECT id, name, email, password, created_at, updated_at FROM users WHERE id = ?',
    [id],
  );

  return rows[0] ?? null;
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string,
): Promise<User> {
  const [result] = await getPool().execute<ResultSetHeader>(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, passwordHash],
  );

  const user = await findUserById(result.insertId);

  if (!user) {
    throw new Error('Failed to create user');
  }

  return user;
}

export async function deleteUserByEmail(email: string): Promise<void> {
  await getPool().execute('DELETE FROM users WHERE email = ?', [email]);
}
