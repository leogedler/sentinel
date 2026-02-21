import { syncFromWindsor } from '../controllers/windsor.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRouter } from '../helpers';

const router = createRouter();
router.use(authMiddleware);

router.post('/sync', syncFromWindsor);

export default router;
