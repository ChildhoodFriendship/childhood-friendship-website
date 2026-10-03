import { createApp } from './app.js';
import { buildContext } from './bootstrap.js';
import { runMigrations } from './db/migrate.js';

const { ctx, handle } = await buildContext();
if (ctx.env.DATABASE_URL.startsWith('pglite:')) await runMigrations(ctx.db, ctx.env.DATABASE_URL);

const server = createApp(ctx).listen(ctx.env.PORT, () => {
  console.log(`API in ascolto su http://localhost:${ctx.env.PORT} (${ctx.env.NODE_ENV}${ctx.ai ? `, AI: ${ctx.ai.name}` : ', AI disattivata'})`);
});

const shutdown = () => {
  server.close(() => { void handle.close().finally(() => process.exit(0)); });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
