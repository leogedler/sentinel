import { Schedule, Campaign, Skill, Client } from '../../shared/db/models';
import { UserContext } from './campaigns.tool';

interface CreateScheduleArgs {
  campaignIds: string[];
  frequency: 'daily' | 'weekly';
  time: string; // HH:MM
  skillId?: string;
}

function toCronExpression(frequency: 'daily' | 'weekly', time: string): string {
  const [hours, minutes] = time.split(':');
  return frequency === 'daily'
    ? `${minutes} ${hours} * * *`
    : `${minutes} ${hours} * * 1`; // weekly on Monday
}

export async function createScheduleTool(args: CreateScheduleArgs, ctx: UserContext) {
  const { campaignIds, frequency, time, skillId } = args;

  if (!time.match(/^\d{1,2}:\d{2}$/)) {
    throw new Error('time must be in HH:MM format (e.g. "09:00")');
  }

  // Resolve skill: use provided skillId or fall back to the default system skill
  let resolvedSkillId = skillId;
  if (!resolvedSkillId) {
    const defaultSkill = await Skill.findOne({ name: 'Daily Performance Summary', type: 'system' });
    if (!defaultSkill) throw new Error('Default skill not found. Please run the seed script.');
    resolvedSkillId = String(defaultSkill._id);
  }

  const cronExpression = toCronExpression(frequency, time);
  const created: string[] = [];

  for (const campaignId of campaignIds) {
    const campaign = await Campaign.findOne({ _id: campaignId });
    if (!campaign) continue;

    const client = await Client.findOne({ _id: campaign.clientId, userId: ctx.userId });
    if (!client) continue;

    await Schedule.create({
      clientId: client._id,
      campaignId: campaign._id,
      skillId: resolvedSkillId,
      cronExpression,
      timezone: 'UTC',
      isActive: true,
    });

    created.push(campaign.name);
  }

  if (created.length === 0) {
    throw new Error('No valid campaigns found for the provided IDs.');
  }

  return {
    scheduled: created,
    frequency,
    time,
    message: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} reports scheduled at ${time} UTC for: ${created.join(', ')}.`,
  };
}
