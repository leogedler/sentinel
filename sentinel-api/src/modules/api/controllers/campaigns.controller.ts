import { Response } from 'express';
import { z } from 'zod';
import { Campaign, Client } from '../../shared/db/models';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const createCampaignSchema = z.object({
  name: z.string().min(1),
  facebookCampaignId: z.string().min(1),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  facebookCampaignId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

async function verifyClientOwnership(req: AuthRequest): Promise<void> {
  const client = await Client.findOne({ _id: req.params.clientId, userId: req.user!._id });
  if (!client) throw new AppError(404, 'Client not found');
}

export async function listCampaigns(req: AuthRequest, res: Response): Promise<void> {
  await verifyClientOwnership(req);
  const campaigns = await Campaign.find({ clientId: req.params.clientId });
  res.json(campaigns);
}

export async function createCampaign(req: AuthRequest, res: Response): Promise<void> {
  await verifyClientOwnership(req);
  const body = createCampaignSchema.parse(req.body);
  const campaign = await Campaign.create({ ...body, clientId: req.params.clientId });
  res.status(201).json(campaign);
}

export async function getCampaign(req: AuthRequest, res: Response): Promise<void> {
  await verifyClientOwnership(req);
  const campaign = await Campaign.findOne({ _id: req.params.id, clientId: req.params.clientId });
  if (!campaign) throw new AppError(404, 'Campaign not found');
  res.json(campaign);
}

export async function updateCampaign(req: AuthRequest, res: Response): Promise<void> {
  await verifyClientOwnership(req);
  const body = updateCampaignSchema.parse(req.body);
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.id, clientId: req.params.clientId },
    body,
    { new: true }
  );
  if (!campaign) throw new AppError(404, 'Campaign not found');
  res.json(campaign);
}

export async function deleteCampaign(req: AuthRequest, res: Response): Promise<void> {
  await verifyClientOwnership(req);
  const campaign = await Campaign.findOneAndDelete({
    _id: req.params.id,
    clientId: req.params.clientId,
  });
  if (!campaign) throw new AppError(404, 'Campaign not found');
  res.json({ message: 'Campaign deleted' });
}
