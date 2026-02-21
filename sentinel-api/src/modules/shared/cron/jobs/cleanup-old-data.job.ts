import Agenda, { Job } from 'agenda';
import { CampaignSnapshot } from '../../db/models';
import { logger } from '../../utils/logger';

const RETENTION_DAYS = 90;

export function defineCleanupOldDataJob(agenda: Agenda) {
  agenda.define('cleanup_old_data', async (_job: Job) => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

      const result = await CampaignSnapshot.deleteMany({
        date: { $lt: cutoffDate },
      });

      logger.info('Cleanup: removed old snapshots', { deletedCount: result.deletedCount, retentionDays: RETENTION_DAYS });
    } catch (error) {
      logger.error('cleanup_old_data failed:', error);
    }
  });
}
