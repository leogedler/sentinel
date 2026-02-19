import { Router } from 'express';
import { syncFromWindsor } from '../controllers/windsor.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../helpers';

const router = Router();
router.use(authMiddleware);

router.post('/sync', asyncHandler(syncFromWindsor));

export default router;
