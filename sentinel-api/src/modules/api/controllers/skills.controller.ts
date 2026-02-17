import { Response } from 'express';
import { z } from 'zod';
import { Skill } from '../../shared/db/models';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const createSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  promptTemplate: z.string().min(1),
  parameters: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['string', 'number', 'date', 'enum']),
      required: z.boolean(),
      default: z.any().optional(),
      options: z.array(z.string()).optional(),
      description: z.string(),
    })
  ).optional().default([]),
  category: z.enum(['reporting', 'analysis', 'optimization', 'alerting']),
});

const updateSkillSchema = createSkillSchema.partial();

export async function listSkills(req: AuthRequest, res: Response): Promise<void> {
  const skills = await Skill.find({
    $or: [{ type: 'system' }, { createdBy: req.user!._id }],
  });
  res.json(skills);
}

export async function createSkill(req: AuthRequest, res: Response): Promise<void> {
  const body = createSkillSchema.parse(req.body);
  const skill = await Skill.create({
    ...body,
    type: 'custom',
    createdBy: req.user!._id,
  });
  res.status(201).json(skill);
}

export async function updateSkill(req: AuthRequest, res: Response): Promise<void> {
  const body = updateSkillSchema.parse(req.body);
  const skill = await Skill.findById(req.params.id);
  if (!skill) throw new AppError(404, 'Skill not found');

  if (skill.type === 'system') throw new AppError(403, 'Cannot modify system skills');
  if (skill.createdBy?.toString() !== req.user!._id.toString()) {
    throw new AppError(403, 'Not authorized');
  }

  Object.assign(skill, body);
  await skill.save();
  res.json(skill);
}

export async function deleteSkill(req: AuthRequest, res: Response): Promise<void> {
  const skill = await Skill.findById(req.params.id);
  if (!skill) throw new AppError(404, 'Skill not found');

  if (skill.type === 'system') throw new AppError(403, 'Cannot delete system skills');
  if (skill.createdBy?.toString() !== req.user!._id.toString()) {
    throw new AppError(403, 'Not authorized');
  }

  await skill.deleteOne();
  res.json({ message: 'Skill deleted' });
}
