# syntax=docker/dockerfile:1
#
# Mutual NDA Creator: the Next.js app in frontend/.
#
# Build from the REPO ROOT, because the app reads ../data/templates at build time:
#   docker build -f frontend/Dockerfile -t prelegal-frontend .
#   docker run --rm -p 3000:3000 prelegal-frontend
#
# Run the type check and unit tests:
#   docker build -f frontend/Dockerfile --target test -t prelegal-frontend-test .
#   docker run --rm prelegal-frontend-test

ARG NODE_VERSION=24

# --- Dependencies ------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

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
RUN npm run build

# --- Runtime image -----------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
