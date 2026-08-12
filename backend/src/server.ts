import app from './app';
import config from './config';
import { closePool, initializeDatabase } from './config/database';

async function handleStartupFailure(error: unknown): Promise<void> {
  console.error('Failed to start server:', error);
  process.exitCode = 1;

  try {
    await closePool();
  } catch (closeError) {
    console.error('Failed to close database pool:', closeError);
    process.exitCode = 1;
  }
}

async function startServer(): Promise<void> {
  try {
    await initializeDatabase();

    const server = app.listen(config.port, (): void => {
      console.log(`Server running on port ${config.port}`);
    });

    server.on('error', (error) => {
      void handleStartupFailure(error);
    });
  } catch (error) {
    await handleStartupFailure(error);
  }
}

void startServer();
