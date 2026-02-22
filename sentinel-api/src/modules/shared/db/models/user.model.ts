import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { encrypt, decrypt } from '../../utils/encryption';

export interface ISlackWorkspace {
  teamId: string;
  teamName: string;
  accessToken: string; // encrypted at rest
  botUserId?: string;
  slackUserId?: string; // Slack user ID of the Sentinel owner who installed the app
}

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  googleId?: string;
  windsorApiKey?: string;
  slackWorkspaces: ISlackWorkspace[];
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const slackWorkspaceSchema = new Schema<ISlackWorkspace>(
  {
    teamId: { type: String, required: true },
    teamName: { type: String, required: true },
    accessToken: {
      type: String,
      required: true,
      set: (val: string) => (val ? encrypt(val) : val),
      get: (val: string) => {
        if (!val) return val;
        try { return decrypt(val); } catch { return val; }
      },
    },
    botUserId: { type: String },
    slackUserId: { type: String },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    name: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    googleId: { type: String, sparse: true, unique: true },
    windsorApiKey: {
      type: String,
      set: (val: string) => (val ? encrypt(val) : val),
      get: (val: string) => {
        if (!val) return val;
        try { return decrypt(val); } catch { return val; }
      },
    },
    slackWorkspaces: { type: [slackWorkspaceSchema], default: [] },
    timezone: { type: String, default: 'UTC' },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', userSchema);
