// src/routes/intent.routes.ts
import { Router } from 'express';
import { commitIntent, getIntentStatus, getAllIntents, decryptIntent } from '../controllers/intent.controller';

const router = Router();

router.get('/', getAllIntents);
router.post('/commit', commitIntent);
router.get('/:intentHash/decrypt', decryptIntent);
router.get('/:intentHash', getIntentStatus);

export default router;