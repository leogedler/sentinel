import { getSettings, updateSettings, getTokenUsage } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRouter } from '../helpers';

const router = createRouter();
router.use(authMiddleware);

router.get('/', getSettings);
router.get('/token-usage', getTokenUsage);
router.put('/', updateSettings);

export default router;
