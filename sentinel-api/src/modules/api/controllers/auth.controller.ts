import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { User } from '../../shared/db/models';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const googleSchema = z.object({
  credential: z.string().min(1),
});

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ userId }, secret, { expiresIn: (process.env.JWT_EXPIRY || '24h') as jwt.SignOptions['expiresIn'] });
}

function userPayload(user: InstanceType<typeof User>) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function register(req: AuthRequest, res: Response): Promise<void> {
  const body = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: body.email });
  if (existing) throw new AppError(409, 'Email already registered');

  const name = `${body.firstName} ${body.lastName}`.trim();
  const user = await User.create({
    email: body.email,
    passwordHash: body.password,
    name,
    firstName: body.firstName,
    lastName: body.lastName,
  });

  const token = signToken(String(user._id));
  res.status(201).json({ token, user: userPayload(user) });
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);

  const user = await User.findOne({ email: body.email });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await user.comparePassword(body.password);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const token = signToken(String(user._id));
  res.json({ token, user: userPayload(user) });
}

export async function googleAuth(req: AuthRequest, res: Response): Promise<void> {
  const { credential } = googleSchema.parse(req.body);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured');

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();

  if (!payload?.email) throw new AppError(400, 'Invalid Google token');

  const { email, given_name: firstName = '', family_name: lastName = '', sub: googleId } = payload;
  const name = `${firstName} ${lastName}`.trim() || email;

  // Find by googleId first, then fall back to email (links existing accounts)
  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (!user) {
    user = await User.create({ email, name, firstName, lastName, googleId });
  } else if (!user.googleId) {
    user.googleId = googleId;
    user.firstName = user.firstName ?? firstName;
    user.lastName = user.lastName ?? lastName;
    await user.save();
  }

  const token = signToken(String(user._id));
  res.json({ token, user: userPayload(user) });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user!;
  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    timezone: user.timezone,
    slackWorkspaces: user.slackWorkspaces.map((w) => ({
      teamId: w.teamId,
      teamName: w.teamName,
    })),
    hasWindsorApiKey: !!user.windsorApiKey,
  });
}
