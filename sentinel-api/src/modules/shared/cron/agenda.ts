import Agenda from 'agenda';
import { logger } from '../utils/logger';
import { defineFetchCampaignDataJob } from './jobs/fetch-campaign-data.job';
import { defineRunScheduledReportJob } from './jobs/run-scheduled-report.job';
import { defineCleanupOldDataJob } from './jobs/cleanup-old-data.job';

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

  await agenda.start();

  // Schedule recurring cleanup job
  await agenda.every('0 0 * * *', 'cleanup_old_data');

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
