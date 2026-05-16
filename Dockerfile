# syntax=docker/dockerfile:1
# Multi-stage build for HD2 Council — pnpm monorepo, Next.js standalone output.
# Build context must be the monorepo root:
#   docker build -f apps/hd2-council/Dockerfile -t hd2-council .

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── deps stage ───────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .pnpmfile.cjs .npmrc ./
COPY packages/db/package.json ./packages/db/
COPY packages/voting/package.json ./packages/voting/
COPY packages/rbac/package.json ./packages/rbac/
COPY packages/comms/package.json ./packages/comms/
COPY packages/templates/package.json ./packages/templates/
COPY packages/documents/package.json ./packages/documents/
COPY governance-loop/package.json ./governance-loop/
COPY apps/hd2-council/package.json ./apps/hd2-council/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ── builder stage ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /repo/packages/voting/node_modules ./packages/voting/node_modules
COPY --from=deps /repo/packages/comms/node_modules ./packages/comms/node_modules
COPY --from=deps /repo/packages/rbac/node_modules ./packages/rbac/node_modules
COPY --from=deps /repo/packages/templates/node_modules ./packages/templates/node_modules
COPY --from=deps /repo/packages/documents/node_modules ./packages/documents/node_modules
COPY --from=deps /repo/apps/hd2-council/node_modules ./apps/hd2-council/node_modules
COPY . .

# Generate Prisma client
RUN pnpm --filter @platform/db run generate

# Build Next.js app with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter hd2-council run build

# ── runner stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3004

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /repo/apps/hd2-council/.next/standalone ./
COPY --from=builder /repo/apps/hd2-council/.next/static ./apps/hd2-council/.next/static
COPY --from=builder /repo/apps/hd2-council/public ./apps/hd2-council/public

USER nextjs
EXPOSE 3004

CMD ["node", "apps/hd2-council/server.js"]
