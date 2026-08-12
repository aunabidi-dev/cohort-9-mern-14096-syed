import { Router, type Request, type Response } from 'express';
import type { HealthResponse } from '../types/health';
import { login, register } from '../controllers/authController';

const router = Router();

router.get('/health', (_req: Request, res: Response<HealthResponse>): void => {
  res.json({
    status: 'ok',
    message: 'Notes API is running',
  });
});

router.post('/auth/register', register);
router.post('/auth/login', login);

export default router;
