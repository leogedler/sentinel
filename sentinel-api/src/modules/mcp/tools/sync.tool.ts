import { syncClientsAndCampaigns, SyncResult } from '../../shared/facebook/windsor.service';
import { UserContext } from './campaigns.tool';

export async function syncClientsCampaignsTool(
  _args: Record<string, never>,
  userContext: UserContext
): Promise<SyncResult> {
  if (!userContext.windsorApiKey) {
    throw new Error('Windsor API key not configured. Go to Settings to add it.');
  }
  return syncClientsAndCampaigns(userContext.userId, userContext.windsorApiKey);
}
