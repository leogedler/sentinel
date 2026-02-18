import { Router } from 'express';
import { slackInstall, slackOAuthCallback } from '../controllers/slack.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../helpers';

const router = Router();

router.get('/install', authMiddleware, asyncHandler(slackInstall));
router.get('/oauth/callback', asyncHandler(slackOAuthCallback));

export default router;
