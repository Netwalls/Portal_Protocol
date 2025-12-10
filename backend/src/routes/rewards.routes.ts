// src/routes/rewards.routes.ts
import { Router } from 'express';
import { getPendingRewards, claimRewards, getRewards, getRewardHistory, getRewardSummary, getPenaltyHistory } from '../controllers/rewards.controller';

const router = Router();

router.get('/pending/:address', getPendingRewards);
router.get('/:address', getRewards);
router.get('/history/:address', getRewardHistory);
router.get('/summary/:address?', getRewardSummary);
router.get('/penalties/list', getPenaltyHistory);
router.post('/claim', claimRewards);

export default router;