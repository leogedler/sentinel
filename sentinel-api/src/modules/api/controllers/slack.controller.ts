import { Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../../shared/utils/logger';
import { User } from '../../shared/db/models';

export async function slackInstall(req: AuthRequest, res: Response): Promise<void> {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) throw new AppError(500, 'Slack client ID not configured');

  const state = Buffer.from(req.user!._id.toString()).toString('base64');
  const redirectUri = `${process.env.API_BASE_URL}/api/slack/oauth/callback`;
  const scopes = 'app_mentions:read,channels:history,channels:read,chat:write,commands,users:read';
  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

  res.redirect(url);
}

export async function slackOAuthCallback(req: AuthRequest, res: Response): Promise<void> {
  const { code, state } = req.query;
  if (!code) throw new AppError(400, 'Missing authorization code');
  if (!state) throw new AppError(400, 'Missing state parameter');

  let userId: string;
  try {
    userId = Buffer.from(state as string, 'base64').toString('utf8');
  } catch {
    throw new AppError(400, 'Invalid state parameter');
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError(401, 'User not found');

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new AppError(500, 'Slack OAuth not configured');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

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

    const { access_token, team, bot_user_id } = response.data;

    // Upsert: update if this workspace is already connected, otherwise add it
    const existingIndex = user.slackWorkspaces.findIndex((w) => w.teamId === team.id);
    if (existingIndex >= 0) {
      user.slackWorkspaces[existingIndex] = {
        teamId: team.id,
        teamName: team.name,
        accessToken: access_token,
        botUserId: bot_user_id,
      };
    } else {
      user.slackWorkspaces.push({
        teamId: team.id,
        teamName: team.name,
        accessToken: access_token,
        botUserId: bot_user_id,
      });
    }
    await user.save();

    logger.info(`Slack workspace "${team.name}" connected for user ${user.email}`);
    res.redirect(`${frontendUrl}/settings?slack=connected`);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Slack OAuth error:', error);
    res.redirect(`${frontendUrl}/settings?slack=error`);
  }
}

export async function disconnectSlackWorkspace(req: AuthRequest, res: Response): Promise<void> {
  const { teamId } = req.params;
  const user = req.user!;

  const before = user.slackWorkspaces.length;
  user.slackWorkspaces = user.slackWorkspaces.filter((w) => w.teamId !== teamId);

  if (user.slackWorkspaces.length === before) {
    throw new AppError(404, 'Workspace not found');
  }

  await user.save();
  logger.info(`Slack workspace ${teamId} disconnected for user ${user.email}`);
  res.json({ message: 'Workspace disconnected' });
}
