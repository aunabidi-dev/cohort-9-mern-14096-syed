import { describe, it, before, after, type Context } from 'mocha';
import { expect } from 'chai';
import type { Server } from 'http';
import app from '../app';

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

describe('Phase 6 error handling & 404 routing', function (this: Context) {
  this.timeout(10000);

  let server: Server;
  let baseUrl: string;

  before(async () => {
    server = await startServer();
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Unable to resolve test server address');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (server) {
      await stopServer(server);
    }
  });

  describe('404 Not Found routing', () => {
    it('returns 404 with standard error message for unknown GET route under /api', async () => {
      const response = await apiRequest(baseUrl, '/api/unknown-endpoint');

      expect(response.status).to.equal(404);

      const body = (await response.json()) as { message: string };
      expect(body).to.deep.equal({ message: 'Route not found' });
    });

    it('returns 404 with standard error message for unknown top-level route', async () => {
      const response = await apiRequest(baseUrl, '/completely-unknown-route');

      expect(response.status).to.equal(404);

      const body = (await response.json()) as { message: string };
      expect(body).to.deep.equal({ message: 'Route not found' });
    });

    it('returns 404 with standard error message for unknown POST route', async () => {
      const response = await apiRequest(baseUrl, '/api/not-a-valid-post-route', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      });

      expect(response.status).to.equal(404);

      const body = (await response.json()) as { message: string };
      expect(body).to.deep.equal({ message: 'Route not found' });
    });
  });

  describe('malformed request handling', () => {
    it('returns 400 Bad Request when request body is malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{ "email": "test@example.com", malformed ',
      });

      expect(response.status).to.equal(400);

      const body = (await response.json()) as { message: string; stack?: unknown };
      expect(body).to.have.property('message');
      expect(body.message).to.equal('Invalid JSON payload');
      expect(body).to.not.have.property('stack');
    });
  });

  describe('error response security', () => {
    it('never exposes stack traces or internal server details to clients', async () => {
      const response = await apiRequest(baseUrl, '/api/nonexistent');

      expect(response.status).to.equal(404);

      const body = (await response.json()) as Record<string, unknown>;
      expect(body).to.have.property('message');
      expect(body).to.not.have.property('stack');
      expect(body).to.not.have.property('sql');
      expect(body).to.not.have.property('errno');
      expect(body).to.not.have.property('code');
    });
  });
});
