'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/server');

/** Start the app on an ephemeral port so tests never collide. */
function withServer(app, fn) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', async () => {
      const base = `http://127.0.0.1:${server.address().port}`;
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
