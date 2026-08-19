import mysql, { type Pool } from 'mysql2/promise';
import config from './index';
import { initializeUsersTable } from '../models/user';
import { initializeNotesTable } from '../models/note';
import { AppError } from '../types/error';

let pool: Pool | null = null;

function validateDatabaseConfig(): void {
  const { user, password, database } = config.db;

  if (!user || !password || !database) {
    throw new AppError(
      500,
      'Database configuration is incomplete. Check DB_USER, DB_PASSWORD, and DB_NAME.',
    );
  }
}

export function getPool(): Pool {
  if (!pool) {
    validateDatabaseConfig();

    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return pool;
}

export async function initializeDatabase(): Promise<void> {
  validateDatabaseConfig();

  try {
    const connection = await getPool().getConnection();
    connection.release();
    await initializeUsersTable();
    await initializeNotesTable();
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw new AppError(500, 'Unable to connect to the database');
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
