'use strict';

import type { Config } from '../config';

const express: typeof import('express') = require('express');
const config: Config = require('../config.ts');

export interface HealthRouterOptions {
  isReady?: () => boolean;
}

export type HealthRouter = (options?: HealthRouterOptions) => import('express').Router;

/**
 * Liveness and readiness are DIFFERENT questions, and conflating them causes
 * outages:
 *
 *   /healthz   — "is this process alive?" A failure makes Kubernetes RESTART
 *                the pod, so it must not depend on anything external. If it
 *                checked a database, a database blip would restart every pod
 *                and turn a degradation into an outage.
 *
 *   /readiness — "should this pod receive traffic right now?" A failure only
 *                removes it from the Service endpoints. Dependency checks
 *                belong here, and here only.
 */
function healthRouter({ isReady = () => true }: HealthRouterOptions = {}) {
  const router = express.Router();

  router.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/readiness', (_req, res) => {
    const ready = isReady();
    // 503 (not 500) is what makes Kubernetes drain rather than restart.
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not-ready' });
  });

  router.get('/version', (_req, res) => {
    res.json(config.build);
  });

  return router;
}

module.exports = { healthRouter };
