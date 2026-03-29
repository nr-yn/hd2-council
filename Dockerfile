# syntax=docker/dockerfile:1
# Build context must be the repo root: docker build -f apps/hd2-council/Dockerfile .

# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:24-slim AS deps
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ packages/
COPY apps/hd2-council/package.json apps/hd2-council/
# Stub other apps so pnpm doesn't try to install them
COPY apps/governance-brain/package.json apps/governance-brain/ 2>/dev/null || true
COPY apps/campaign-council/package.json apps/campaign-council/ 2>/dev/null || true
COPY apps/fantasy-council/package.json apps/fantasy-council/ 2>/dev/null || true

RUN pnpm install --frozen-lockfile

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY packages/ packages/
COPY apps/hd2-council/ apps/hd2-council/

# Generate Prisma client
RUN pnpm --filter @platform/db generate

# Build the Next.js standalone app
RUN pnpm --filter hd2-council build

# ── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:24-slim AS runner
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3004
WORKDIR /app

# Copy standalone Next.js output
COPY --from=builder /app/apps/hd2-council/.next/standalone ./
COPY --from=builder /app/apps/hd2-council/.next/static ./apps/hd2-council/.next/static
COPY --from=builder /app/apps/hd2-council/public ./apps/hd2-council/public

# Copy the generated Prisma client (needed at runtime)
COPY --from=builder /app/packages/db/generated ./packages/db/generated
# Copy better-sqlite3 native binary
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
# Copy @prisma/adapter-better-sqlite3
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI (needed by instrumentation.ts to run migrate deploy at startup)
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Migrations + schema (needed at startup by prisma migrate deploy)
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

# Startup script — runs migrations then starts Next.js
COPY apps/hd2-council/docker-start.sh ./docker-start.sh
RUN chmod +x docker-start.sh

EXPOSE 3004

CMD ["sh", "docker-start.sh"]
