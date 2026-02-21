import Agenda, { Job } from 'agenda';
import { Campaign, CampaignSnapshot, Client, User } from '../../db/models';
import { fetchCampaignData } from '../../facebook/windsor.client';
import { logger } from '../../utils/logger';

export function defineFetchCampaignDataJob(agenda: Agenda) {
  agenda.define('fetch_campaign_data', async (job: Job) => {
    const { campaignId, userId } = job.attrs.data as {
      campaignId: string;
      userId: string;
    };

    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign || !campaign.isActive) return;

      const user = await User.findById(userId);
      if (!user?.windsorApiKey) {
        logger.warn('No Windsor API key for user', { userId });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const kpis = await fetchCampaignData(user.windsorApiKey, campaign.facebookCampaignId, {
        start: today,
        end: today,
      });

      await CampaignSnapshot.findOneAndUpdate(
        { campaignId: campaign._id, date: new Date(today) },
        {
          ...kpis,
          campaignId: campaign._id,
          date: new Date(today),
          fetchedAt: new Date(),
        },
        { upsert: true }
      );

      logger.info('Fetched data for campaign', { campaignId, campaignName: campaign.name });
    } catch (error) {
      logger.error('fetch_campaign_data failed', error, { campaignId });
    }
  });
}
