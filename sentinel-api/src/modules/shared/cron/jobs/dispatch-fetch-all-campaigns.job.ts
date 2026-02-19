import Agenda, { Job } from 'agenda';
import { Campaign, Client, User } from '../../db/models';
import { logger } from '../../utils/logger';

export function defineDispatchFetchAllCampaignsJob(agenda: Agenda) {
  agenda.define('dispatch_fetch_all_campaigns', async (_job: Job) => {
    try {
      const campaigns = await Campaign.find({ isActive: true });
      let count = 0;

      for (const campaign of campaigns) {
        const client = await Client.findById(campaign.clientId);
        if (!client) continue;

        const user = await User.findById(client.userId);
        if (!user?.windsorApiKey) continue;

        await agenda.now('fetch_campaign_data', {
          campaignId: String(campaign._id),
          userId: String(user._id),
        });
        count++;
      }

      logger.info(`dispatch_fetch_all_campaigns: queued ${count} fetch jobs`);
    } catch (error) {
      logger.error('dispatch_fetch_all_campaigns failed:', error);
    }
  });
}
