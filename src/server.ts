'use strict';

import type { HealthRouter } from './handlers/health';
import type { Logger } from './log';

const express: typeof import('express') = require('express');
const client: typeof import('prom-client') = require('prom-client');
const { healthRouter }: { healthRouter: HealthRouter } = require('./handlers/health.ts');
const log: Logger = require('./log.ts');

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests by method, route and status',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration by method and route',
  labelNames: ['method', 'route'],
  registers: [registry],
});

export interface CreateAppOptions {
  isReady?: () => boolean;
}

export type CreateApp = (options?: CreateAppOptions) => import('express').Express;

/**
 * Build the app.
 *
 * `isReady` is injected rather than read from a global so tests can drive the
 * readiness state directly, and so real services can hang it off whatever
 * dependency actually gates traffic.
 */
function createApp({ isReady }: CreateAppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      // req.route is undefined for 404s; falling back to the raw path would
      // give unbounded label cardinality, so bucket them as "unmatched".
      const route = req.route?.path || (res.statusCode === 404 ? 'unmatched' : req.path);
      httpRequests.inc({ method: req.method, route, status: res.statusCode });
      end({ method: req.method, route });
    });
    next();
  });

  app.use(healthRouter({ isReady }));

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  app.use((_req, res) => res.status(404).json({ error: 'not found' }));

  // Four args — Express only treats this as an error handler with the arity.
  app.use(
    (
      err: Error,
      _req: import('express').Request,
      res: import('express').Response,
      _next: import('express').NextFunction,
    ) => {
      log.error('unhandled request error', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'internal server error' });
    },
  );

  return app;
}

module.exports = { createApp, registry };
