'use strict';

/**
 * Build metadata, injected at image build time and surfaced on /version so a
 * running pod can be traced back to a commit.
 */
export interface BuildInfo {
  version: string;
  commit: string;
  date: string;
}

export interface Config {
  host: string;
  port: number;
  logLevel: string;

  // How long to let in-flight requests finish on SIGTERM. Must be shorter than
  // Kubernetes' terminationGracePeriodSeconds or the pod is SIGKILLed mid-drain.
  shutdownTimeoutMs: number;

  build: BuildInfo;

  /** Collect every problem, so one restart surfaces all of them. */
  check(): string[];
}

/**
 * Configuration from environment, resolved once at startup.
 *
 * Fail fast and loudly: a service that boots with a bad port and dies on first
 * request is worse than one that refuses to start.
 */
const config: Config = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '8080', 10),
  logLevel: (process.env.LOG_LEVEL || 'info').toLowerCase(),

  shutdownTimeoutMs: parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10),

  build: {
    version: process.env.BUILD_GIT_VERSION || 'dev',
    commit: process.env.BUILD_GIT_COMMIT || 'none',
    date: process.env.BUILD_DATE || 'unknown',
  },

  check(): string[] {
    const problems: string[] = [];
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      problems.push(`invalid PORT: ${process.env.PORT}`);
    }
    if (!Number.isInteger(config.shutdownTimeoutMs) || config.shutdownTimeoutMs < 0) {
      problems.push(`invalid SHUTDOWN_TIMEOUT_MS: ${process.env.SHUTDOWN_TIMEOUT_MS}`);
    }
    return problems;
  },
};

module.exports = config;
