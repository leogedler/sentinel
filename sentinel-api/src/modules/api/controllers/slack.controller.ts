import { Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../../shared/utils/logger';

export async function slackInstall(_req: AuthRequest, res: Response): Promise<void> {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) throw new AppError(500, 'Slack client ID not configured');

  const redirectUri = `${process.env.API_BASE_URL}/api/slack/oauth/callback`;
  const scopes = 'channels:history,channels:read,chat:write,commands,users:read';
  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.redirect(url);
}

export async function slackOAuthCallback(req: AuthRequest, res: Response): Promise<void> {
  const { code } = req.query;
  if (!code) throw new AppError(400, 'Missing authorization code');

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new AppError(500, 'Slack OAuth not configured');

  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${process.env.API_BASE_URL}/api/slack/oauth/callback`,
      },
    });

    if (!response.data.ok) {
      throw new AppError(400, `Slack OAuth error: ${response.data.error}`);
    }

    const { access_token, team } = response.data;
    const user = req.user!;
    user.slackAccessToken = access_token;
    user.slackWorkspaceId = team.id;
    await user.save();

    logger.info(`Slack workspace ${team.name} connected for user ${user.email}`);
    res.json({ message: 'Slack workspace connected', workspace: team.name });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Slack OAuth error:', error);
    throw new AppError(500, 'Failed to complete Slack OAuth');
  }
}
