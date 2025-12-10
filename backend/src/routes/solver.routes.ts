// src/routes/solver.routes.ts
import { Router } from 'express';
import {
  registerSolver,
  triggerSettlement,
  getSolverStatus
} from '../controllers/solver.controller';

const router = Router();

router.post('/register', registerSolver);
router.post('/settle', triggerSettlement);
router.get('/status/:address', getSolverStatus);

export default router;