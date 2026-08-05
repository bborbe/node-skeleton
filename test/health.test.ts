'use strict';

import type { CreateApp } from '../src/server';

const test: typeof import('node:test') = require('node:test');
const assert: typeof import('node:assert') = require('node:assert');
const { createApp }: { createApp: CreateApp } = require('../src/server.ts');

/** Narrows a `fetch().json()` result before asserting keys on it. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Start the app on an ephemeral port so tests never collide. */
function withServer(
  app: ReturnType<typeof createApp>,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', async () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      const base = `http://127.0.0.1:${port}`;
      try {
        await fn(base);
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        server.close();
      }
    });
  });
}

test('healthz reports ok', async () => {
  await withServer(createApp(), async (base) => {
    const res = await fetch(`${base}/healthz`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });
});

test('readiness reports ready when the check passes', async () => {
  await withServer(createApp({ isReady: () => true }), async (base) => {
    const res = await fetch(`${base}/readiness`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ready' });
  });
});

test('readiness returns 503 when not ready, so k8s drains instead of restarting', async () => {
  await withServer(createApp({ isReady: () => false }), async (base) => {
    const res = await fetch(`${base}/readiness`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { status: 'not-ready' });
  });
});

test('liveness stays ok even when readiness fails', async () => {
  // Guards the split: a failing dependency must not restart the pod.
  await withServer(createApp({ isReady: () => false }), async (base) => {
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
  });
});

test('version exposes build metadata', async () => {
  await withServer(createApp(), async (base) => {
    const body = await (await fetch(`${base}/version`)).json();
    if (!isRecord(body)) throw new Error('expected /version to respond with a JSON object');
    for (const key of ['version', 'commit', 'date']) assert.ok(key in body);
  });
});

test('metrics are exposed in prometheus format', async () => {
  await withServer(createApp(), async (base) => {
    await fetch(`${base}/healthz`); // generate one sample
    const body = await (await fetch(`${base}/metrics`)).text();
    assert.match(body, /http_requests_total/);
  });
});

test('unknown routes 404 as json', async () => {
  await withServer(createApp(), async (base) => {
    const res = await fetch(`${base}/nope`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'not found' });
  });
});
