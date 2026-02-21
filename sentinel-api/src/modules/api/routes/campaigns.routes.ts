import { listCampaigns, createCampaign, getCampaign, updateCampaign, deleteCampaign } from '../controllers/campaigns.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRouter } from '../helpers';

const router = createRouter({ mergeParams: true });
router.use(authMiddleware);

router.get('/', listCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

export default router;
