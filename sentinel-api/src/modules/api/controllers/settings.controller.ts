import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const updateSettingsSchema = z.object({
  windsorApiKey: z.string().optional(),
  timezone: z.string().optional(),
});

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!;
  res.json({
    windsorApiKey: user.windsorApiKey ? '••••••••' : null,
    timezone: user.timezone,
    slackWorkspaceId: user.slackWorkspaceId,
  });
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  const body = updateSettingsSchema.parse(req.body);
  const user = req.user!;

  if (body.windsorApiKey !== undefined) user.windsorApiKey = body.windsorApiKey;
  if (body.timezone !== undefined) user.timezone = body.timezone;

  await user.save();
  res.json({
    windsorApiKey: user.windsorApiKey ? '••••••••' : null,
    timezone: user.timezone,
  });
}
