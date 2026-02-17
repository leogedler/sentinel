import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../helpers';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler(getSettings));
router.put('/', asyncHandler(updateSettings));

export default router;
