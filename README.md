# Rahman Store — Retail Shop Manager

A retail shop management system with two faces on one backend:

- **Employee desktop app** — fast operational work: POS, stock, purchases, customers, expenses.
- **Owner mobile dashboard** — summary, profit, trends and alerts, built for a phone.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 19 + TypeScript + responsive CSS |
| Backend | Node 20+ + Express + TypeScript, feature routers with shared validation |
| Database | PostgreSQL + Prisma ORM |
| Shared | `@shop/shared` — Zod schemas, types and the permission map used by **both** sides |

## Getting started

```bash
# 1. install
pnpm install

# 2. start local postgres (or point DATABASE_URL at your own database)
pnpm db:up

# 3. configure
cp apps/api/.env.example apps/api/.env
#    then set DATABASE_URL and replace the example JWT secrets:
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. create schema + demo data
pnpm db:migrate
pnpm db:seed

# 5. run
pnpm dev            # api :4000 and web :5173 together
```

Check the API is alive: <http://localhost:4000/health>

### Demo accounts

Password for all three: `Password123`

| Role | Email | Sees |
|---|---|---|
| Owner | owner@shop.test | Everything, incl. financial reports and user management |
| Manager | manager@shop.test | All operations + financial reports, no user/settings management |
| Employee | employee@shop.test | POS, stock-in, products, customers only |

The seed creates 5 days of realistic history — purchases, sales, expenses,
low-stock items and notifications — so the dashboard and reports are populated
from the first run.

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | Run API and web together |
| `pnpm dev:api` / `pnpm dev:web` | Run one side |
| `pnpm db:migrate` | Create/apply migrations |
| `pnpm db:seed` | Load demo data |
| `pnpm db:reset` | Drop, re-migrate and reseed |
| `pnpm db:studio` | Browse the database in Prisma Studio |
| `pnpm typecheck` | Type-check every package |
| `pnpm --filter @shop/api test:smoke` | Run the non-mutating API auth/RBAC smoke test |

## Structure

```
shop-manager/
├── packages/shared/        # Zod schemas, types, permissions, money formatting
├── apps/api/
│   ├── prisma/             # schema.prisma, seed.ts, seed-data.ts
│   └── src/
│       ├── lib/            # env, prisma, logger, ApiError, respond
│       ├── middleware/      # error handling, authentication and permissions
│       └── modules/        # auth, dashboard, products, inventory, sales, etc.
└── apps/web/               # responsive React application
```

See `ARCHITECTURE.md` for the design decisions behind the schema and API.
