import dotenv from 'dotenv';
import type { AppConfig } from '../types/config';

dotenv.config();

const config: AppConfig = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

export default config;
