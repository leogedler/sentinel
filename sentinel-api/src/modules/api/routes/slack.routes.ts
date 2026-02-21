import { slackInstall, slackOAuthCallback, disconnectSlackWorkspace } from '../controllers/slack.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRouter } from '../helpers';

const router = createRouter();

router.get('/install', authMiddleware, slackInstall);
router.get('/oauth/callback', slackOAuthCallback);
router.delete('/workspace/:teamId', authMiddleware, disconnectSlackWorkspace);

export default router;
