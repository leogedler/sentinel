import { Skill, ISkill } from '../db/models';
import { logger } from '../utils/logger';

export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

export async function executeSkill(
  skillId: string,
  variables: Record<string, string>
): Promise<{ skill: ISkill; renderedPrompt: string }> {
  const skill = await Skill.findById(skillId);
  if (!skill) throw new Error(`Skill not found: ${skillId}`);
  if (!skill.isActive) throw new Error(`Skill is inactive: ${skill.name}`);

  const renderedPrompt = renderTemplate(skill.promptTemplate, variables);
  logger.info(`Executed skill: ${skill.name}`);

  return { skill, renderedPrompt };
}
