# node-skeleton

Node.js microservice skeleton — the Node sibling of [go-skeleton](https://github.com/bborbe/go-skeleton) and [python-skeleton](https://github.com/bborbe/python-skeleton), with the same Makefile split, Docker build and k8s deploy flow.

Copy it, rename, delete what you don't need.

## What you get

|                   |                                                          |
| ----------------- | -------------------------------------------------------- |
| `/healthz`        | Liveness — is the process alive                          |
| `/readiness`      | Readiness — should this pod get traffic (503 when not)   |
| `/version`        | Build version, commit and date baked in at image build   |
| `/metrics`        | Prometheus, incl. per-route request count and duration   |
| Graceful shutdown | Fails readiness first, then drains, with a hard timeout  |
| Structured logs   | JSON lines to stdout/stderr                              |
| `make precommit`  | format, lint, test — the same reflex as every other repo |
| `make buca`       | build, upload, clean, apply                              |

## Quick start

```bash
make install     # npm ci
make precommit   # format + lint + test
make run         # http://localhost:8080
```

```bash
curl localhost:8080/healthz     # {"status":"ok"}
curl localhost:8080/readiness   # {"status":"ready"}
curl localhost:8080/version
curl localhost:8080/metrics
```

## Make targets

| Target           | Does                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| `make precommit` | `install format test check` — run before every commit                            |
| `make test`      | `node --test` (built-in runner, no test framework dependency)                    |
| `make check`     | eslint + prettier verification                                                   |
| `make format`    | rewrite with prettier, autofix eslint                                            |
| `make build`     | Docker build for `linux/amd64`, tagged `$(DOCKER_REGISTRY)/$(SERVICE):$(BRANCH)` |
| `make upload`    | push that tag                                                                    |
| `make clean`     | remove the local image, prune the builder cache                                  |
| `make apply`     | apply `k8s/*.yaml` through `teamvault-config-parser`                             |
| **`make buca`**  | **build → upload → clean → apply**                                               |

## Layout

```
src/index.js            entrypoint: listen, signals, graceful shutdown
src/server.js           express app, metrics middleware, error handling
src/config.js           env -> config, validated at startup
src/log.js              JSON-line logger
src/handlers/health.js  /healthz, /readiness, /version
test/                   node:test, no framework
k8s/                    deployment + service, applied by `make apply`
```

## Liveness vs readiness — the distinction that matters

They answer different questions, and conflating them turns a degradation into an outage.

- **`/healthz`** — "is this process alive?" Failing it makes Kubernetes **restart the pod**, so it must not touch any dependency. A liveness probe that checks a database will restart every pod when the database blips.
- **`/readiness`** — "should this pod receive traffic _right now_?" Failing it only removes the pod from Service endpoints. Dependency checks belong here, and it returns **503** so Kubernetes drains instead of restarting.

`createApp({ isReady })` takes the readiness check as an argument, so a real service hangs it off whatever actually gates traffic, and tests can drive it directly.

## Graceful shutdown ordering

On `SIGTERM` the service **fails readiness before it stops accepting connections**. That ordering is the point: Kubernetes needs a moment to remove the pod from Service endpoints, and requests routed in during that window would otherwise be refused. Only then does the listener close and in-flight requests drain, with a hard timeout (`SHUTDOWN_TIMEOUT_MS`, default 10s) that must stay below the pod's `terminationGracePeriodSeconds`.

The Dockerfile `ENTRYPOINT`s `node` directly rather than going through `npm`, so PID 1 is the process that actually receives the signal.

## Configuration

| Env                                                     | Default   | Meaning                                        |
| ------------------------------------------------------- | --------- | ---------------------------------------------- |
| `HOST`                                                  | `0.0.0.0` | Bind address                                   |
| `PORT`                                                  | `8080`    | Bind port (validated at startup)               |
| `LOG_LEVEL`                                             | `info`    | `error`, `warn`, `info`, `debug`               |
| `SHUTDOWN_TIMEOUT_MS`                                   | `10000`   | Hard cap on the drain                          |
| `BUILD_GIT_VERSION` / `BUILD_GIT_COMMIT` / `BUILD_DATE` | —         | Injected at image build, exposed on `/version` |

`example.env` also carries `DOCKER_REGISTRY` and `CLUSTER_CONTEXT` for the build and deploy targets.

## Deliberately not included

Kafka, Sentry and a database layer are in the Go and Python skeletons but left out here — add them when a service actually needs one, rather than carrying dead dependencies in every copy.

## Why Node at all

Node earns its place where the ecosystem is the reason: `@discordjs/voice` for Discord audio, for instance. For a plain service, prefer Go. This skeleton exists so that when Node _is_ the right answer, the service still behaves like everything else in the fleet.
