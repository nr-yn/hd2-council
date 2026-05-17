# Contributing to HD2 Council

## Prerequisites

The `@nr-yn/*` packages (db, governance, rbac, documents) are published to GitHub Packages. You need a GitHub Personal Access Token (PAT) with `read:packages` scope to install them.

### Setup

1. [Create a PAT](https://github.com/settings/tokens/new) with `read:packages` selected
2. Export it:
   ```sh
   export NODE_AUTH_TOKEN=ghp_your_token_here
   ```
3. Install:
   ```sh
   pnpm install
   ```

## Local Development

Copy `.env.example` to `.env` and fill in your database URL and other secrets.

```sh
pnpm dev        # Next.js dev server on :3004
pnpm test       # Vitest unit tests
pnpm e2e        # Playwright E2E
```

## Pull Requests

- Target the `main` branch
- `pnpm test` and `pnpm exec tsc --noEmit` must pass
- One feature or fix per PR
