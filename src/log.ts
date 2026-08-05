'use strict';

import type { Config } from './config';

const config: Config = require('./config.ts');

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type LogFields = Record<string, unknown>;

export interface Logger {
  error(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  debug(msg: string, fields?: LogFields): void;
}

// JSON lines: what log aggregators want, and what `kubectl logs | jq` can read.
const LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

// The env value is an unvalidated string, so this lookup needs the
// generic-string-indexed view of the same object; noUncheckedIndexedAccess
// makes the result `number | undefined`, resolved by falling back to `info`.
const LEVELS_BY_NAME: Record<string, number> = LEVELS;
const threshold = LEVELS_BY_NAME[config.logLevel] ?? LEVELS.info;

function emit(level: LogLevel, msg: string, fields: LogFields = {}): void {
  // `level` is always one of the four known keys, so this indexes the
  // finite-key view of LEVELS (no index signature involved) and stays typed
  // as `number`, unlike the LEVELS_BY_NAME lookup above.
  if (LEVELS[level] > threshold) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });
  // stderr for error/warn so `kubectl logs` stream separation stays useful.
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n');
}

const log: Logger = {
  error: (m, f) => emit('error', m, f),
  warn: (m, f) => emit('warn', m, f),
  info: (m, f) => emit('info', m, f),
  debug: (m, f) => emit('debug', m, f),
};

module.exports = log;
