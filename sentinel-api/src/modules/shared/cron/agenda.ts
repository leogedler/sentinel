import Agenda from 'agenda';
import { logger } from '../utils/logger';
import { defineFetchCampaignDataJob } from './jobs/fetch-campaign-data.job';
import { defineRunScheduledReportJob } from './jobs/run-scheduled-report.job';
import { defineCleanupOldDataJob } from './jobs/cleanup-old-data.job';
import { defineDispatchFetchAllCampaignsJob } from './jobs/dispatch-fetch-all-campaigns.job';
import { defineDispatchRunScheduledReportsJob } from './jobs/dispatch-run-scheduled-reports.job';

let agenda: Agenda | null = null;

export async function startAgenda(): Promise<Agenda> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI required for Agenda');

  agenda = new Agenda({
    db: { address: mongoUri, collection: 'agendaJobs' },
    processEvery: '1 minute',
  });

  // Define jobs
  defineFetchCampaignDataJob(agenda);
  defineRunScheduledReportJob(agenda);
  defineCleanupOldDataJob(agenda);
  defineDispatchFetchAllCampaignsJob(agenda);
  defineDispatchRunScheduledReportsJob(agenda);

  await agenda.start();

  // Global recurring jobs
  await agenda.every('0 0 * * *', 'cleanup_old_data');
  await agenda.every('0 * * * *', 'dispatch_fetch_all_campaigns');   // hourly
  await agenda.every('* * * * *', 'dispatch_run_scheduled_reports'); // every minute

  logger.info('Agenda scheduler started');
  return agenda;
}

export function getAgenda(): Agenda | null {
  return agenda;
}

export async function stopAgenda(): Promise<void> {
  if (agenda) {
    await agenda.stop();
    logger.info('Agenda scheduler stopped');
  }
}
