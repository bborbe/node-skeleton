'use strict';

/**
 * Configuration from environment, resolved once at startup.
 *
 * Fail fast and loudly: a service that boots with a bad port and dies on first
 * request is worse than one that refuses to start.
 */
const config = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '8080', 10),
  logLevel: (process.env.LOG_LEVEL || 'info').toLowerCase(),

  // How long to let in-flight requests finish on SIGTERM. Must be shorter than
  // Kubernetes' terminationGracePeriodSeconds or the pod is SIGKILLed mid-drain.
  shutdownTimeoutMs: parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10),

  // Injected at image build time; surfaced on /version so a running pod can be
  // traced back to a commit.
  build: {
    version: process.env.BUILD_GIT_VERSION || 'dev',
    commit: process.env.BUILD_GIT_COMMIT || 'none',
    date: process.env.BUILD_DATE || 'unknown',
  },
};

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error(`invalid PORT: ${process.env.PORT}`);
}

module.exports = config;
