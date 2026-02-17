import { Response } from 'express';
import { z } from 'zod';
import { Schedule, Client } from '../../shared/db/models';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const createScheduleSchema = z.object({
  campaignId: z.string().min(1),
  skillId: z.string().min(1),
  cronExpression: z.string().min(1),
  isActive: z.boolean().optional().default(true),
});

const updateScheduleSchema = z.object({
  skillId: z.string().min(1).optional(),
  cronExpression: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

async function verifyClientOwnership(req: AuthRequest): Promise<void> {
  const client = await Client.findOne({ _id: req.params.clientId, userId: req.user!._id });
  if (!client) throw new AppError(404, 'Client not found');
}

export async function listSchedules(req: AuthRequest, res: Response): Promise<void> {
  await verifyClientOwnership(req);
  const schedules = await Schedule.find({ clientId: req.params.clientId })
    .populate('campaignId')
    .populate('skillId');
  res.json(schedules);
}

export async function createSchedule(req: AuthRequest, res: Response): Promise<void> {
  await verifyClientOwnership(req);
  const body = createScheduleSchema.parse(req.body);
  const schedule = await Schedule.create({
    ...body,
    clientId: req.params.clientId,
    timezone: req.user!.timezone,
  });
  res.status(201).json(schedule);
}

export async function updateSchedule(req: AuthRequest, res: Response): Promise<void> {
  await verifyClientOwnership(req);
  const body = updateScheduleSchema.parse(req.body);
  const schedule = await Schedule.findOneAndUpdate(
    { _id: req.params.id, clientId: req.params.clientId },
    body,
    { new: true }
  );
  if (!schedule) throw new AppError(404, 'Schedule not found');
  res.json(schedule);
}

export async function deleteSchedule(req: AuthRequest, res: Response): Promise<void> {
  await verifyClientOwnership(req);
  const schedule = await Schedule.findOneAndDelete({
    _id: req.params.id,
    clientId: req.params.clientId,
  });
  if (!schedule) throw new AppError(404, 'Schedule not found');
  res.json({ message: 'Schedule deleted' });
}
