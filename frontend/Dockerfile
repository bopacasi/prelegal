# syntax=docker/dockerfile:1
#
# Prelegal frontend: the Next.js app in frontend/.
#
# Build from the REPO ROOT, because the app reads data/templates:
#   docker build -f frontend/Dockerfile -t prelegal-frontend .
# The app needs the backend; run the whole stack with scripts/start.sh.
#
# Run the type check and unit tests:
#   docker build -f frontend/Dockerfile --target test -t prelegal-frontend-test .
#   docker run --rm prelegal-frontend-test

ARG NODE_VERSION=24

# --- Dependencies ------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# --- Source: app code plus the template dataset -----------------------------
FROM node:${NODE_VERSION}-alpine AS source
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/frontend
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./
COPY data/ /app/data/

# --- Tests: `docker run` this target to type-check and run the unit tests ----
FROM source AS test
CMD ["sh", "-c", "npm run typecheck && npm test"]

# --- Production build --------------------------------------------------------
FROM source AS build
# The /api rewrite to the backend is fixed at build time.
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=${BACKEND_URL}
RUN npm run build

# --- Runtime image -----------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
ARG BACKEND_URL=http://backend:8000
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    BACKEND_URL=${BACKEND_URL} \
    TEMPLATES_DIR=/app/data/templates
WORKDIR /app
COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./.next/static
# Signed-in pages render per request and read the templates at runtime.
COPY --from=build --chown=node:node /app/data/templates ./data/templates
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/login"]
CMD ["node", "server.js"]
