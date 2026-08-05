# Changelog

## Unreleased

- docs: Add `CLAUDE.md` — coding-guideline pointers, the non-obvious invariants behind the shutdown/health/metrics code, and the propagation warning that every new service inherits from this repo

## v0.0.1

- Initial commit
- Express service with `/healthz`, `/readiness`, `/version`, `/metrics`
- Graceful shutdown that fails readiness before closing the listener
- Split Makefiles: precommit, docker (build/upload/clean/apply/buca), k8s
- Multi-stage Dockerfile running as non-root with node as PID 1
