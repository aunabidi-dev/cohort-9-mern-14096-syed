import app from './app';
import config from './config';
import { closePool, initializeDatabase } from './config/database';
import { logger } from './utils/logger';

async function handleStartupFailure(error: unknown): Promise<void> {
  logger.error({ err: error }, 'Failed to start server');
  process.exitCode = 1;

  try {
    await closePool();
  } catch (closeError) {
    logger.error({ err: closeError }, 'Failed to close database pool');
    process.exitCode = 1;
  }
}

async function startServer(): Promise<void> {
  try {
    await initializeDatabase();

    const server = app.listen(config.port, (): void => {
      logger.info(`Server running on port ${config.port}`);
    });

    server.on('error', (error) => {
      void handleStartupFailure(error);
    });
  } catch (error) {
    await handleStartupFailure(error);
  }
}

void startServer();
