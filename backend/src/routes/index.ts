import { Router, type Request, type Response } from 'express';
import type { HealthResponse } from '../types/health';

const router = Router();

router.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: 'ok',
    message: 'Notes API is running',
  });
});

export default router;
