# Changelog

All notable changes to this project will be documented in this file.

Please choose versions by [Semantic Versioning](http://semver.org/).

- MAJOR version when you make incompatible API changes,
- MINOR version when you add functionality in a backwards-compatible manner, and
- PATCH version when you make backwards-compatible bug fixes.

## Unreleased

- feat: Convert the skeleton from CommonJS JavaScript to CommonJS TypeScript — strict `tsconfig.json` (`noUncheckedIndexedAccess`), a `typecheck` target (`tsc --noEmit`) wired into `make check`, erasable-syntax-only sources so `node src/index.ts` runs with no build step, and startup-validated config (`config.check()`) instead of a type assertion
- docs: Add `CLAUDE.md` — coding-guideline pointers, the non-obvious invariants behind the shutdown/health/metrics code, and the propagation warning that every new service inherits from this repo
- fix: Add the canonical Semantic Versioning preamble to `CHANGELOG.md`, which was missing entirely

## v0.0.1

- Initial commit
- Express service with `/healthz`, `/readiness`, `/version`, `/metrics`
- Graceful shutdown that fails readiness before closing the listener
- Split Makefiles: precommit, docker (build/upload/clean/apply/buca), k8s
- Multi-stage Dockerfile running as non-root with node as PID 1
