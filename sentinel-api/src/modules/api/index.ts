import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import clientsRoutes from './routes/clients.routes';
import campaignsRoutes from './routes/campaigns.routes';
import skillsRoutes from './routes/skills.routes';
import settingsRoutes from './routes/settings.routes';
import schedulesRoutes from './routes/schedules.routes';
import slackRoutes from './routes/slack.routes';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/clients/:clientId/campaigns', campaignsRoutes);
  app.use('/api/skills', skillsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/clients/:clientId/schedules', schedulesRoutes);
  app.use('/api/slack', slackRoutes);

  // Error handler
  app.use(errorMiddleware);

  return app;
}
