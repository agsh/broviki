# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mediamtx/package.json apps/mediamtx/

RUN npm ci -w @broviki/api --include-workspace-root=false --ignore-scripts \
  && npm rebuild better-sqlite3

COPY apps/api apps/api

WORKDIR /app/apps/api
RUN npx prisma generate && npx nest build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/data/broviki.db

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mediamtx/package.json apps/mediamtx/

# Keep openssl/ca-certificates after build tools are removed (Prisma migrate needs them).
# `prisma -v` downloads schema-engine into the image so migrate deploy does not
# hang on first boot waiting for binaries.prisma.sh.
RUN npm ci -w @broviki/api --omit=dev --include-workspace-root=false --ignore-scripts \
  && npm rebuild better-sqlite3 \
  && cd apps/api && npx prisma -v \
  && apt-get purge -y python3 make g++ \
  && apt-get autoremove -y \
  && apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=build /app/apps/api/src/generated ./apps/api/src/generated
COPY apps/api/docker-entrypoint.sh /entrypoint.sh

# Bake schema-engine into the image (npm --ignore-scripts skips Prisma postinstall).
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
ENV CHECKPOINT_DISABLE=1
RUN chmod +x /entrypoint.sh \
  && cd /app/apps/api \
  && ./node_modules/.bin/prisma -v

WORKDIR /app/apps/api
EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
