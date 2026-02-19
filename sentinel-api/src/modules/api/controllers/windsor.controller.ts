import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { syncClientsAndCampaigns } from '../../shared/facebook/windsor.service';

export async function syncFromWindsor(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!;
  if (!user.windsorApiKey) {
    throw new AppError(400, 'Windsor API key not configured. Go to Settings to add it.');
  }
  const result = await syncClientsAndCampaigns(String(user._id), user.windsorApiKey);
  res.json(result);
}
