#!/usr/bin/env node
'use strict';

const config = require('./config');
const log = require('./log');
const { createApp } = require('./server');

// Flipped false on SIGTERM so /readiness fails BEFORE the server stops
// accepting. That ordering is the whole point: Kubernetes needs a moment to
// remove the pod from Service endpoints, and requests routed in during that
// window would otherwise be refused.
let ready = true;

const app = createApp({ isReady: () => ready });
const server = app.listen(config.port, config.host, () => {
  log.info('listening', {
    host: config.host,
    port: config.port,
    version: config.build.version,
    commit: config.build.commit,
  });
});

function shutdown(signal) {
  log.info('shutting down', { signal });
  ready = false; // fail readiness first, keep serving in-flight traffic

  const timer = setTimeout(() => {
    log.error('graceful shutdown timed out, forcing exit', {
      timeoutMs: config.shutdownTimeoutMs,
    });
    process.exit(1);
  }, config.shutdownTimeoutMs);
  timer.unref(); // don't let the timer itself hold the process open

  server.close((err) => {
    clearTimeout(timer);
    if (err) {
      log.error('error during shutdown', { error: err.message });
      process.exit(1);
    }
    log.info('shutdown complete');
    process.exit(0);
  });
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => shutdown(sig));
}

// Crash loudly rather than continuing in an unknown state — Kubernetes will
// restart the pod, which is almost always better than a zombie process.
process.on('unhandledRejection', (reason) => {
  log.error('unhandled rejection', { error: String(reason) });
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  log.error('uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
