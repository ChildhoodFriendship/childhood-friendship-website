import express, { Router, type Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import type { AppContext } from './context.js';
import { authenticate, requireAuth } from './middleware/auth.js';
import { csrf } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { aiRouter, aiUsageRouter } from './modules/ai/ai.routes.js';
import { appointmentsRouter } from './modules/appointments/appointments.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientsRouter } from './modules/clients/clients.routes.js';
import { credentialsRouter } from './modules/credentials/credentials.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { documentsRouter } from './modules/documents/documents.routes.js';
import { leadsRouter, publicLeadsRouter } from './modules/leads/leads.routes.js';
import { marketingRouter } from './modules/marketing/marketing.routes.js';
import { messagesRouter } from './modules/messages/messages.routes.js';
import { projectScope } from './modules/projects/access.js';
import { projectsRouter } from './modules/projects/projects.routes.js';
import { salonRouter } from './modules/salon/salon.routes.js';
import { tasksRouter } from './modules/tasks/tasks.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export function createApp(ctx: AppContext): Express {
  const app = express();
  const isProd = ctx.env.NODE_ENV === 'production';

  app.disable('x-powered-by');
  app.set('trust proxy', ctx.env.TRUST_PROXY);
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }, crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const api = Router();
  api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  api.use(rateLimit({
    windowMs: 60_000, limit: ctx.env.NODE_ENV === 'test' ? 10_000 : 300, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Troppe richieste, rallenta.' } }
  }));
  api.use(csrf(isProd, (path) => path.startsWith('/public/') || path.startsWith('/salon/')));
  api.use(authenticate(ctx));

  api.get('/health', (_req, res) => { res.json({ ok: true }); });
  api.use('/public/leads', publicLeadsRouter(ctx));
  api.use('/salon', salonRouter(ctx));
  api.use('/auth', authRouter(ctx));

  api.use(requireAuth);
  api.use('/dashboard', dashboardRouter(ctx));
  api.use('/users', usersRouter(ctx));
  api.use('/clients', clientsRouter(ctx));
  api.use('/leads', leadsRouter(ctx));
  api.use('/audit', auditRouter(ctx));
  api.use('/ai', aiUsageRouter(ctx));
  api.use('/projects', projectsRouter(ctx));

  const scope = projectScope(ctx);
  const nested = Router({ mergeParams: true });
  nested.use(scope);
  nested.use('/tasks', tasksRouter(ctx));
  nested.use('/documents', documentsRouter(ctx));
  nested.use('/messages', messagesRouter(ctx));
  nested.use('/credentials', credentialsRouter(ctx));
  nested.use('/appointments', appointmentsRouter(ctx));
  nested.use('/marketing', marketingRouter(ctx));
  nested.use('/ai', aiRouter(ctx));
  api.use('/projects/:projectId', nested);

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler(isProd));
  return app;
}
