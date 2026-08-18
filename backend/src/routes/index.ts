import { Router, type Request, type Response } from 'express';
import type { HealthResponse } from '../types/health';
import { login, register } from '../controllers/authController';
import notesRouter from './notes';

const router = Router();

router.get('/health', (_req: Request, res: Response<HealthResponse>): void => {
  res.json({
    status: 'ok',
    message: 'Notes API is running',
  });
});

router.post('/auth/register', register);
router.post('/auth/login', login);

router.use('/notes', notesRouter);

export default router;
