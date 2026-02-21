import { getSettings, updateSettings } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRouter } from '../helpers';

const router = createRouter();
router.use(authMiddleware);

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
