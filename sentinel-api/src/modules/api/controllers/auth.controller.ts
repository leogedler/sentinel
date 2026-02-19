import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../../shared/db/models';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ userId }, secret, { expiresIn: (process.env.JWT_EXPIRY || '24h') as jwt.SignOptions['expiresIn'] });
}

export async function register(req: AuthRequest, res: Response): Promise<void> {
  const body = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: body.email });
  if (existing) throw new AppError(409, 'Email already registered');

  const user = await User.create({
    email: body.email,
    passwordHash: body.password,
    name: body.name,
  });

  const token = signToken(String(user._id));
  res.status(201).json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
  });
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);

  const user = await User.findOne({ email: body.email });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await user.comparePassword(body.password);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const token = signToken(String(user._id));
  res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
  });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!;
  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    slackWorkspaces: user.slackWorkspaces.map((w) => ({
      teamId: w.teamId,
      teamName: w.teamName,
    })),
    hasWindsorApiKey: !!user.windsorApiKey,
  });
}
