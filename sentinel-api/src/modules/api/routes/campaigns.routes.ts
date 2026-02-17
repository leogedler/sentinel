import { Router } from 'express';
import { listCampaigns, createCampaign, getCampaign, updateCampaign, deleteCampaign } from '../controllers/campaigns.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../helpers';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

router.get('/', asyncHandler(listCampaigns));
router.post('/', asyncHandler(createCampaign));
router.get('/:id', asyncHandler(getCampaign));
router.put('/:id', asyncHandler(updateCampaign));
router.delete('/:id', asyncHandler(deleteCampaign));

export default router;
