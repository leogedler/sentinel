import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { encrypt, decrypt } from '../../utils/encryption';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  windsorApiKey?: string;
  slackWorkspaceId?: string;
  slackUserId?: string;
  slackAccessToken?: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    windsorApiKey: {
      type: String,
      set: (val: string) => (val ? encrypt(val) : val),
      get: (val: string) => {
        if (!val) return val;
        try { return decrypt(val); } catch { return val; }
      },
    },
    slackWorkspaceId: { type: String },
    slackUserId: { type: String },
    slackAccessToken: {
      type: String,
      set: (val: string) => (val ? encrypt(val) : val),
      get: (val: string) => {
        if (!val) return val;
        try { return decrypt(val); } catch { return val; }
      },
    },
    timezone: { type: String, default: 'UTC' },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', userSchema);
