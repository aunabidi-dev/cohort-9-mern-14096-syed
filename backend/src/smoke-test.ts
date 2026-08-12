import type { Server } from 'http';
import app from './app';

function startServer(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function runSmokeTest(): Promise<void> {
  let server: Server | undefined;

  try {
    server = await startServer();

    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('unable to resolve server address');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);

    if (!response.ok) {
      throw new Error(`health check returned ${response.status}`);
    }

    const body = (await response.json()) as { status?: string };

    if (body.status !== 'ok') {
      throw new Error(`unexpected health response: ${JSON.stringify(body)}`);
    }

    console.log('Smoke test passed');
  } finally {
    if (server) {
      await stopServer(server);
    }
  }
}

runSmokeTest().catch((error: unknown) => {
  console.error('Smoke test failed:', error);
  process.exitCode = 1;
});
