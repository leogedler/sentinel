import Anthropic from '@anthropic-ai/sdk';
import { Skill, Campaign, Report, Client } from '../../shared/db/models';
import { executeSkill } from '../../shared/skills/skill.engine';
import { fetchCampaignData } from '../../shared/facebook/windsor.client';
import { UserContext } from './campaigns.tool';

export async function listSkills(ctx: UserContext) {
  const skills = await Skill.find({
    $or: [{ type: 'system' }, { createdBy: ctx.userId }],
    isActive: true,
  });

  return {
    skills: skills.map((s) => ({
      id: s._id,
      name: s.name,
      description: s.description,
      category: s.category,
      type: s.type,
    })),
  };
}

export async function runSkill(
  args: { skillId: string; campaignId: string; additionalContext?: string },
  ctx: UserContext
) {
  if (!ctx.windsorApiKey) throw new Error('Windsor API key not configured');

  const campaign = await Campaign.findById(args.campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const kpis = await fetchCampaignData(ctx.windsorApiKey, campaign.facebookCampaignId);

  const variables: Record<string, string> = {
    campaignName: campaign.name,
    currentKPIs: JSON.stringify(kpis, null, 2),
    date: new Date().toISOString().split('T')[0],
    additionalContext: args.additionalContext || '',
  };

  const { renderedPrompt } = await executeSkill(args.skillId, variables);

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: renderedPrompt }],
  });

  const analysis =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Save report
  const client = await Client.findById(campaign.clientId);
  if (client) {
    await Report.create({
      clientId: client._id,
      campaignId: campaign._id,
      skillId: args.skillId,
      content: analysis,
      triggeredBy: 'user',
    });
  }

  return { analysis };
}
