# CLAUDE.md

Instructions for working on `bborbe/node-skeleton`.

## What This Is

The reference Node.js microservice. New Node services are cloned from here, so **every change to this repo propagates to every service created afterwards**. Treat conventions here as load-bearing rather than local preference.

Stack: Node 22+, CommonJS, express 5, `prom-client`, the built-in `node:test` runner, eslint 9 flat config plus prettier. Deployed as a container to Kubernetes.

## Coding Guidelines

Read these before changing code — they are the source of truth, and this repo is expected to satisfy them exactly:

| Guide                                   | Covers                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `coding/docs/node-service-guide.md`     | Config, logging, health endpoints, metrics, graceful shutdown, express wiring, testing, k8s couplings |
| `coding/docs/node-makefile-commands.md` | Build targets, include layout, security gates                                                         |
| `coding/docs/k8s-manifest-guide.md`     | Generic manifest conventions                                                                          |
| `coding/docs/git-commit-guide.md`       | Commit workflow                                                                                       |

Installed as the `coding` Claude Code plugin; the rules are enforced by `node-quality-assistant` via `/coding:pr-review` and `/coding:code-review`.

## Non-Obvious Invariants

These exist for reasons that are not visible from the code alone. The comments in the source explain each one — keep them when editing.

- **Readiness is set false BEFORE `server.close()`** (`src/index.js`). Kubernetes removes the pod from Service endpoints and sends SIGTERM concurrently, not in sequence. Closing the listener first refuses connections routed in during that window, producing reset errors on every deploy.
- **Readiness failure returns 503, not 500.** 503 makes Kubernetes drain; 500 reads as an application fault and, combined with a liveness probe, escalates into a restart loop.
- **`/healthz` must never touch an external dependency.** A liveness failure restarts the pod, so a dependency check there converts a downstream blip into a full restart of every replica.
- **The shutdown timer is `unref()`d.** A referenced timer keeps the event loop alive for its full duration, so a fast shutdown would still take the maximum grace period — multiplied across every pod on a rolling deploy.
- **404s bucket into a `unmatched` metric label** (`src/server.js`). `req.route?.path` is undefined for unmatched requests; using the raw path gives unbounded Prometheus label cardinality, and a single crawler can exhaust the scrape target.
- **`error`/`warn` go to stderr, `info`/`debug` to stdout** (`src/log.js`). Preserves `kubectl logs` stream separation.
- **`terminationGracePeriodSeconds` (30) must exceed `SHUTDOWN_TIMEOUT_MS` (10000).** Otherwise the pod is SIGKILLed mid-drain and the whole graceful-shutdown path is wasted.
- **Prometheus scrapes via pod annotations**, not `ServiceMonitor` — `prometheus.io/scrape` + `port` + `path` in `k8s/skeleton-deploy.yaml`. Removing `/metrics` without removing the annotations produces silent scrape errors; the reverse means metrics are computed and never collected.

## Build and Test

```bash
make precommit    # install format test check — run before every commit
make test         # node --test
make check        # lint formatcheck audit trivy
make run          # node src/index.js
```

`install` uses `npm ci`, never `npm install` — the lockfile is the build input.

## Git Workflow

Feature branch → PR to `master` → merge. Never commit directly to `master`.

`.maintainer.yaml` sets `autoRelease: true`: add bullets under `## Unreleased` in `CHANGELOG.md` with a conventional prefix (`feat:`, `fix:`, `docs:`, `chore:`), and the releaser rewrites the header and tags after merge. **Never hand-tag or rename `## Unreleased` yourself** — that races the releaser.

## When Changing This Repo

Because every future service inherits from here:

- Prefer removing a convention over adding an unexplained one
- Any non-obvious invariant gets a comment saying _why_, not _what_ — the list above was reconstructed from those comments
- New dependencies are a cost paid by every future service; justify them in the PR
- If a change makes the skeleton diverge from `node-service-guide.md`, either the change or the guide is wrong — resolve it, do not ship the divergence
