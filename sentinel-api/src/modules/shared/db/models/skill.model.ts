import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISkillParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'enum';
  required: boolean;
  default?: any;
  options?: string[];
  description: string;
}

export interface ISkill extends Document {
  name: string;
  description: string;
  promptTemplate: string;
  parameters: ISkillParameter[];
  type: 'system' | 'custom';
  category: 'reporting' | 'analysis' | 'optimization' | 'alerting';
  createdBy: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const skillParameterSchema = new Schema<ISkillParameter>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['string', 'number', 'date', 'enum'], required: true },
    required: { type: Boolean, default: false },
    default: { type: Schema.Types.Mixed },
    options: [{ type: String }],
    description: { type: String, required: true },
  },
  { _id: false }
);

const skillSchema = new Schema<ISkill>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    promptTemplate: { type: String, required: true },
    parameters: [skillParameterSchema],
    type: { type: String, enum: ['system', 'custom'], default: 'custom' },
    category: {
      type: String,
      enum: ['reporting', 'analysis', 'optimization', 'alerting'],
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Skill = mongoose.model<ISkill>('Skill', skillSchema);
