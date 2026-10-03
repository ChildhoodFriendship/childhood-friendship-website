/** Entry per Vercel Functions: un'unica istanza Express riusata tra le invocazioni "calde". */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';
import { createApp } from './app.js';
import { buildContext } from './bootstrap.js';

let appPromise: Promise<Express> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  appPromise ??= buildContext().then(({ ctx }) => createApp(ctx));
  const app = await appPromise;
  app(req as Parameters<Express>[0], res as Parameters<Express>[1]);
}
