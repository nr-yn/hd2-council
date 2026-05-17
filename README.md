# HD2 Council

**Community-driven governance for Helldivers 2** players submit, vote on, and petition balance changes, bug fixes, and quality-of-life improvements directly to Arrowhead.

🗳️ **Live site: [democracy.quorate.cc](https://democracy.quorate.cc)**

---

## What it does

- Players submit issues (balance, bugs, QoL, content)
- Community votes on what matters most
- Each season, top-voted issues are drafted into a formal petition
- Petition is published as a PDF and submitted to Arrowhead

## Stack

- **Next.js 16** (App Router)
- **PostgreSQL** + Prisma
- Docker + Caddy for deployment

## Self-hosting

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup. Requires:
- Node 22 / pnpm 10
- PostgreSQL 17
- GitHub PAT with `read:packages` (for `@nr-yn/*` packages)
- `.env` with `DATABASE_URL`, `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `RESEND_API_KEY`

```sh
cp .env.example .env
pnpm install
pnpm dev
```

## Governance model

Each **season** runs a full cycle:

```
Submission → Voting → Drafting → Published Petition
```

Issues with zero votes are marked stale at season close. Top issues by vote rank, with per-category caps, make it into the petition draft.

## License

MIT
