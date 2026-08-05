# Build stage — install production deps only, from the lockfile.
FROM node:22-slim AS builder

WORKDIR /app

# Copy manifests first so this layer caches until dependencies actually change.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Runtime stage
FROM node:22-slim
ARG BUILD_GIT_VERSION=dev
ARG BUILD_GIT_COMMIT=none
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="Node Skeleton"
LABEL org.opencontainers.image.description="Node.js microservice skeleton/demonstration project"
LABEL org.opencontainers.image.vendor="Benjamin Borbe"
LABEL org.opencontainers.image.licenses="BSD-2-Clause"
LABEL org.opencontainers.image.source="https://github.com/bborbe/node-skeleton"
LABEL org.opencontainers.image.documentation="https://github.com/bborbe/node-skeleton"
LABEL org.opencontainers.image.version="${BUILD_GIT_VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${BUILD_GIT_COMMIT}"

WORKDIR /app

COPY --from=builder /app/node_modules /app/node_modules
COPY package.json ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV BUILD_GIT_VERSION=${BUILD_GIT_VERSION}
ENV BUILD_GIT_COMMIT=${BUILD_GIT_COMMIT}
ENV BUILD_DATE=${BUILD_DATE}

# The node image ships an unprivileged `node` user; use it.
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# No npm wrapper: exec'ing node directly makes PID 1 the process that actually
# receives SIGTERM, which is what makes graceful shutdown work in Kubernetes.
# Node runs .ts directly (type stripping) — no compile step, no dist/ output.
ENTRYPOINT ["node", "src/index.ts"]

EXPOSE 8080
