import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Skill } from '../models';
import { DEFAULT_SKILLS } from '../../skills/default-skills';
import { logger } from '../../utils/logger';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  logger.info('Connected to MongoDB for seeding');

  for (const skillDef of DEFAULT_SKILLS) {
    const existing = await Skill.findOne({ name: skillDef.name, type: 'system' });
    if (existing) {
      logger.info(`Skill "${skillDef.name}" already exists, updating...`);
      Object.assign(existing, skillDef);
      await existing.save();
    } else {
      await Skill.create({ ...skillDef, type: 'system', createdBy: null });
      logger.info(`Created skill: ${skillDef.name}`);
    }
  }

  logger.info(`Seeded ${DEFAULT_SKILLS.length} default skills`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
