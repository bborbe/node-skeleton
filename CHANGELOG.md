# Changelog

## v0.0.1

- Initial commit
- Express service with `/healthz`, `/readiness`, `/version`, `/metrics`
- Graceful shutdown that fails readiness before closing the listener
- Split Makefiles: precommit, docker (build/upload/clean/apply/buca), k8s
- Multi-stage Dockerfile running as non-root with node as PID 1
