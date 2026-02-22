import { createAIProvider } from '../../shared/ai';
import { Skill, Campaign, Report, Client, TokenUsage } from '../../shared/db/models';
import { logger } from '../../shared/utils/logger';
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

  const provider = createAIProvider();
  const response = await provider.createMessage({
    system: '',
    messages: [{ role: 'user', content: renderedPrompt }],
    tools: [],
    max_tokens: 2048,
  });

  const analysis = response.content.find((p) => p.type === 'text')?.text ?? '';

  TokenUsage.create({
    userId: ctx.userId,
    provider: response.provider,
    aiModel: response.model,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    totalTokens: response.usage.inputTokens + response.usage.outputTokens,
    action: 'skill_execution',
  }).catch((err) => logger.warn('Failed to record token usage', { err }));

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
