import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { TokenUsage } from '../../shared/db/models';

const updateSettingsSchema = z.object({
  windsorApiKey: z.string().optional(),
  timezone: z.string().optional(),
});

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!;
  res.json({
    hasWindsorKey: !!user.windsorApiKey,
    timezone: user.timezone,
    slackWorkspaces: user.slackWorkspaces.map((w) => ({
      teamId: w.teamId,
      teamName: w.teamName,
    })),
  });
}

export async function getTokenUsage(req: AuthRequest, res: Response): Promise<void> {
  const userId = new Types.ObjectId(String(req.user!._id));
  const { period = 'month' } = req.query as { period?: string };

  const now = new Date();
  let from: Date;
  if (period === 'week') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const matchStage = { userId, createdAt: { $gte: from } };

  const [totalsResult, breakdown] = await Promise.all([
    TokenUsage.aggregate([
      { $match: matchStage },
      { $group: { _id: null, inputTokens: { $sum: '$inputTokens' }, outputTokens: { $sum: '$outputTokens' }, totalTokens: { $sum: '$totalTokens' }, calls: { $sum: 1 } } },
    ]),
    TokenUsage.aggregate([
      { $match: matchStage },
      { $group: { _id: { provider: '$provider', aiModel: '$aiModel' }, inputTokens: { $sum: '$inputTokens' }, outputTokens: { $sum: '$outputTokens' }, totalTokens: { $sum: '$totalTokens' }, calls: { $sum: 1 } } },
      { $sort: { totalTokens: -1 } },
    ]),
  ]);

  res.json({
    period,
    from: from.toISOString(),
    to: now.toISOString(),
    totals: totalsResult[0] ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0, calls: 0 },
    breakdown: breakdown.map((b) => ({
      provider: b._id.provider,
      model: b._id.aiModel,
      inputTokens: b.inputTokens,
      outputTokens: b.outputTokens,
      totalTokens: b.totalTokens,
      calls: b.calls,
    })),
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
