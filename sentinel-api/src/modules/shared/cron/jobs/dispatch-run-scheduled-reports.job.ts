import Agenda, { Job } from 'agenda';
import { parseExpression } from 'cron-parser';
import { Schedule } from '../../db/models';
import { logger } from '../../utils/logger';

export function defineDispatchRunScheduledReportsJob(agenda: Agenda) {
  agenda.define('dispatch_run_scheduled_reports', async (_job: Job) => {
    try {
      const now = new Date();
      const activeSchedules = await Schedule.find({ isActive: true });
      let count = 0;

      for (const schedule of activeSchedules) {
        try {
          // Compute the next expected run time after the last run (or creation)
          const referenceDate = schedule.lastRunAt ?? schedule.createdAt;
          const interval = parseExpression(schedule.cronExpression, {
            currentDate: referenceDate,
          });
          const nextRun = interval.next().toDate();

          if (nextRun <= now) {
            // Set lastRunAt optimistically before dispatching to prevent
            // double-firing if the job takes longer than one dispatcher tick
            await Schedule.findByIdAndUpdate(schedule._id, { lastRunAt: now });
            await agenda.now('run_scheduled_report', { scheduleId: String(schedule._id) });
            count++;
          }
        } catch {
          logger.warn('dispatch_run_scheduled_reports: skipping invalid cron schedule', {
            scheduleId: schedule._id,
            cronExpression: schedule.cronExpression,
          });
        }
      }

      if (count > 0) {
        logger.info('dispatch_run_scheduled_reports: queued report jobs', { count });
      }
    } catch (error) {
      logger.error('dispatch_run_scheduled_reports failed:', error);
    }
  });
}
