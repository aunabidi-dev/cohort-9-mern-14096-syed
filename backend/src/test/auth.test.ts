import { describe, it, before, after, beforeEach, type Context } from 'mocha';
import { expect } from 'chai';
import type { Server } from 'http';
import type { NextFunction, Response as ExpressResponse } from 'express';
import app from '../app';
import { closePool, initializeDatabase } from '../config/database';
import { deleteUserByEmail } from '../models/user';
import {
  authenticate,
  type AuthenticatedRequest,
} from '../middleware/auth';
import {
  generateToken,
  hashPassword,
  verifyPassword,
  verifyToken,
} from '../utils/auth';
import { AppError } from '../types/error';

const testEmail = `phase2-test-${Date.now()}@example.com`;
const testPassword = 'SecurePass123!';
const testName = 'Phase Two Tester';

function startServer(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function apiRequest(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<globalThis.Response> {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

describe('Phase 2 authentication', () => {
  describe('password utilities', () => {
    it('hashes passwords before storage', async () => {
      const hash = await hashPassword(testPassword);

      expect(hash).to.be.a('string');
      expect(hash).to.not.equal(testPassword);
      expect(await verifyPassword(testPassword, hash)).to.equal(true);
    });
  });

  describe('JWT utilities', () => {
    it('generates and verifies tokens', () => {
      const token = generateToken({ userId: 1, email: 'user@example.com' });
      const payload = verifyToken(token);

      expect(payload.userId).to.equal(1);
      expect(payload.email).to.equal('user@example.com');
    });
  });

  describe('authentication middleware', () => {
    it('rejects missing tokens', () => {
      const req = { headers: {} } as AuthenticatedRequest;
      let receivedError: unknown;

      authenticate(req, {} as ExpressResponse, ((error?: unknown) => {
        receivedError = error;
      }) as NextFunction);

      expect(receivedError).to.be.instanceOf(AppError);
      expect((receivedError as AppError).statusCode).to.equal(401);
    });

    it('rejects invalid tokens', () => {
      const req = {
        headers: { authorization: 'Bearer invalid-token' },
      } as AuthenticatedRequest;
      let receivedError: unknown;

      authenticate(req, {} as ExpressResponse, ((error?: unknown) => {
        receivedError = error;
      }) as NextFunction);

      expect(receivedError).to.be.instanceOf(AppError);
      expect((receivedError as AppError).statusCode).to.equal(401);
    });

    it('accepts valid tokens', () => {
      const token = generateToken({ userId: 42, email: 'valid@example.com' });
      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as AuthenticatedRequest;
      let receivedError: unknown;

      authenticate(req, {} as ExpressResponse, ((error?: unknown) => {
        receivedError = error;
      }) as NextFunction);

      expect(receivedError).to.be.undefined;
      expect(req.user).to.deep.equal({ id: 42, email: 'valid@example.com' });
    });
  });

  describe('auth API', () => {
    let server: Server;
    let baseUrl: string;

    before(async function (this: Context) {
      this.timeout(10000);

      try {
        await initializeDatabase();
      } catch {
        this.skip();
      }

      server = await startServer();
      const address = server.address();

      if (!address || typeof address === 'string') {
        throw new Error('Unable to resolve test server address');
      }

      baseUrl = `http://127.0.0.1:${address.port}/api`;
    });

    after(async () => {
      if (server) {
        await stopServer(server);
      }

      await closePool();
    });

    beforeEach(async () => {
      await deleteUserByEmail(testEmail);
    });

    it('registers a user successfully', async () => {
      const response = await apiRequest(baseUrl, '/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: testName,
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).to.equal(201);

      const body = (await response.json()) as {
        user: { id: number; name: string; email: string; password?: string };
        token: string;
      };

      expect(body.user.email).to.equal(testEmail);
      expect(body.user.name).to.equal(testName);
      expect(body.user).to.not.have.property('password');
      expect(body.token).to.be.a('string').that.is.not.empty;
    });

    it('prevents duplicate email registration', async () => {
      await apiRequest(baseUrl, '/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: testName,
          email: testEmail,
          password: testPassword,
        }),
      });

      const response = await apiRequest(baseUrl, '/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Another User',
          email: testEmail,
          password: 'AnotherPass123!',
        }),
      });

      expect(response.status).to.equal(409);

      const body = (await response.json()) as { message: string };
      expect(body.message).to.equal('Email is already registered');
    });

    it('logs in with valid credentials', async () => {
      await apiRequest(baseUrl, '/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: testName,
          email: testEmail,
          password: testPassword,
        }),
      });

      const response = await apiRequest(baseUrl, '/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).to.equal(200);

      const body = (await response.json()) as {
        user: { email: string; password?: string };
        token: string;
      };

      expect(body.user.email).to.equal(testEmail);
      expect(body.user).to.not.have.property('password');
      expect(body.token).to.be.a('string').that.is.not.empty;
    });

    it('rejects invalid login credentials', async () => {
      const response = await apiRequest(baseUrl, '/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword123!',
        }),
      });

      expect(response.status).to.equal(401);

      const body = (await response.json()) as { message: string };
      expect(body.message).to.equal('Invalid email or password');
    });
  });
});
