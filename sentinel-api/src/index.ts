import dotenv from 'dotenv';
dotenv.config();

import { logger } from './modules/shared/utils/logger';
import { connectDB } from './modules/shared/db/connection';
import { createApp } from './modules/api';
import { startAgenda, stopAgenda } from './modules/shared/cron/agenda';
import { startSlackBot } from './modules/slack-bot/app';

async function main() {
  logger.info('Sentinel backend starting...');

  // 1. Connect to MongoDB
  await connectDB();

  // 2. Start Express API
  const app = createApp();
  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    logger.info(`API server running on port ${port}`);
  });

  // 3. Start Agenda scheduler
  try {
    await startAgenda();
  } catch (error) {
    logger.warn('Agenda scheduler failed to start (non-fatal):', error);
  }

  // 4. Start Slack bot (only if tokens are configured)
  if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN) {
    try {
      await startSlackBot();
    } catch (error) {
      logger.warn('Slack bot failed to start (non-fatal):', error);
    }
  } else {
    logger.info('Slack bot skipped (tokens not configured)');
  }

  // 5. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down...`);
    server.close();
    await stopAgenda();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('Sentinel backend ready');
}

main().catch((err) => {
  logger.error('Fatal error during startup:', err);
  process.exit(1);
});
