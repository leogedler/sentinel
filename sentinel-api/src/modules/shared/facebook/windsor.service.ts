import { Client, Campaign } from '../db/models';
import { fetchAllCampaigns } from './windsor.client';

export interface SyncResult {
  clientsCreated: number;
  clientsUpdated: number;
  campaignsCreated: number;
  campaignsUpdated: number;
}

export async function syncClientsAndCampaigns(userId: string, apiKey: string): Promise<SyncResult> {
  const summaries = await fetchAllCampaigns(apiKey);

  const result: SyncResult = {
    clientsCreated: 0,
    clientsUpdated: 0,
    campaignsCreated: 0,
    campaignsUpdated: 0,
  };

  // Group summaries by account_id
  const byAccount = new Map<string, typeof summaries>();
  for (const s of summaries) {
    const list = byAccount.get(s.account_id) ?? [];
    list.push(s);
    byAccount.set(s.account_id, list);
  }

  for (const [accountId, campaigns] of byAccount) {
    const accountName = campaigns[0].account_name;

    // Match existing client: first by windsorAccountId, then by name
    let client = await Client.findOne({ userId, windsorAccountId: accountId });
    if (!client) {
      client = await Client.findOne({ userId, name: accountName });
    }

    if (client) {
      client.windsorAccountId = accountId;
      await client.save();
      result.clientsUpdated++;
    } else {
      client = await Client.create({
        userId,
        name: accountName,
        windsorAccountId: accountId,
        slackChannelId: '',
      });
      result.clientsCreated++;
    }

    const clientId = client._id;

    for (const campaign of campaigns) {
      const existing = await Campaign.findOne({
        clientId,
        facebookCampaignId: campaign.campaign_id,
      });

      if (existing) {
        existing.name = campaign.campaign_name;
        await existing.save();
        result.campaignsUpdated++;
      } else {
        await Campaign.create({
          clientId,
          name: campaign.campaign_name,
          facebookCampaignId: campaign.campaign_id,
        });
        result.campaignsCreated++;
      }
    }
  }

  return result;
}
