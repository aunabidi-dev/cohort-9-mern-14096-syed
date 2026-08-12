import app from './app';
import config from './config';
import { initializeDatabase } from './config/database';

async function startServer(): Promise<void> {
  try {
    await initializeDatabase();

    app.listen(config.port, (): void => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  }
}

void startServer();
