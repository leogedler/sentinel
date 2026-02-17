import { Response } from 'express';
import { z } from 'zod';
import { Client } from '../../shared/db/models';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const createClientSchema = z.object({
  name: z.string().min(1),
  slackChannelId: z.string().min(1),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  slackChannelId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function listClients(req: AuthRequest, res: Response): Promise<void> {
  const clients = await Client.find({ userId: req.user!._id });
  res.json(clients);
}

export async function createClient(req: AuthRequest, res: Response): Promise<void> {
  const body = createClientSchema.parse(req.body);
  const client = await Client.create({ ...body, userId: req.user!._id });
  res.status(201).json(client);
}

export async function getClient(req: AuthRequest, res: Response): Promise<void> {
  const client = await Client.findOne({ _id: req.params.id, userId: req.user!._id });
  if (!client) throw new AppError(404, 'Client not found');
  res.json(client);
}

export async function updateClient(req: AuthRequest, res: Response): Promise<void> {
  const body = updateClientSchema.parse(req.body);
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    body,
    { new: true }
  );
  if (!client) throw new AppError(404, 'Client not found');
  res.json(client);
}

export async function deleteClient(req: AuthRequest, res: Response): Promise<void> {
  const client = await Client.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  if (!client) throw new AppError(404, 'Client not found');
  res.json({ message: 'Client deleted' });
}
