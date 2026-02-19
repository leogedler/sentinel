import { Router } from 'express';
import { slackInstall, slackOAuthCallback, disconnectSlackWorkspace } from '../controllers/slack.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../helpers';

const router = Router();

router.get('/install', authMiddleware, asyncHandler(slackInstall));
router.get('/oauth/callback', asyncHandler(slackOAuthCallback));
router.delete('/workspace/:teamId', authMiddleware, asyncHandler(disconnectSlackWorkspace));

export default router;
