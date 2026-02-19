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
  // Controlled by ENABLE_AGENDA env var ('true'/'false').
  // Should only run in the api container to avoid duplicate job processing.
  if (process.env.ENABLE_AGENDA !== 'false') {
    try {
      await startAgenda();
    } catch (error) {
      logger.warn('Agenda scheduler failed to start (non-fatal):', error);
    }
  } else {
    logger.info('Agenda scheduler disabled via ENABLE_AGENDA=false');
  }

  // 4. Start Slack bot
  // Controlled by ENABLE_SLACK_BOT env var ('true'/'false').
  // Defaults to true when tokens are present, so existing setups without
  // the variable keep working. Set ENABLE_SLACK_BOT=false in the api
  // container to prevent it from running there.
  const slackEnabled =
    process.env.ENABLE_SLACK_BOT !== 'false' &&
    !!process.env.SLACK_BOT_TOKEN &&
    !!process.env.SLACK_APP_TOKEN;

  if (slackEnabled) {
    try {
      await startSlackBot();
    } catch (error) {
      logger.warn('Slack bot failed to start (non-fatal):', error);
    }
  } else {
    logger.info(
      process.env.ENABLE_SLACK_BOT === 'false'
        ? 'Slack bot disabled via ENABLE_SLACK_BOT=false'
        : 'Slack bot skipped (tokens not configured)'
    );
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
