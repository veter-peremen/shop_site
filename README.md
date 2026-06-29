# SONKEI — premium e-commerce site

Next.js 15 (App Router) storefront with a Postgres (Neon) backend: catalog, cart, checkout,
accounts with a bonus/loyalty program, promo codes, reviews, and an admin panel.

## Stack

- Next.js 15 / React 19, App Router, `next-intl` (ru/en locales)
- PostgreSQL via the `pg` driver (designed for [Neon](https://neon.tech), works with any Postgres)
- Tailwind CSS, Radix UI primitives
- Zod for input validation, custom CSRF + rate-limiting middleware (no external auth/payment provider wired in yet — see "Known gaps" below)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL
npm run db:migrate           # creates/updates all tables
npm run db:seed              # optional: sample products, promos, reviews
npm run dev
```

The app runs at `http://localhost:3000`.

## Running with Docker

The easiest way to share or run this project on another machine — no local Node.js or
Postgres install needed, just Docker.

```bash
docker compose up --build
```

This builds the app and starts it together with its own local Postgres container. The
database schema is applied automatically on startup (idempotent — safe on every restart).
The app will be available at `http://localhost:3000`. The catalog starts empty — run
`docker compose exec app node scripts/seed-products.mjs` (see below) to add sample products.

If `docker compose up --build` fails with `failed to read dockerfile: open Dockerfile: no
such file or directory`, that's a known bug in Docker Compose's newer "Bake" build backend
with some directory paths (not specific to this project). Work around it by building and
starting in two steps instead:

```bash
docker build -t sonkei-app .
docker compose up -d
```

To use an external database (e.g. Neon) instead of the bundled Postgres container, set
`DATABASE_URL` in a `.env` file before running `docker compose up` (the local `db` container
still starts, but goes unused).

`NEXT_PUBLIC_SITE_URL` is baked into the build at compile time (Next.js inlines `NEXT_PUBLIC_*`
vars into the JS bundle), so changing it requires a rebuild:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com docker compose up --build
```

Useful commands once the stack is running:

```bash
docker compose exec app node scripts/make-admin.mjs you@example.com
docker compose exec app node scripts/seed-products.mjs
docker compose logs -f app
```

Stop the stack (keeps the database volume) with `docker compose down`, or wipe the database
too with `docker compose down -v`.

Note: `sitemap.xml` reflects the product catalog as of the last image build (some pages
re-render on demand and pick up new products automatically — see `revalidate` in
`src/app/[locale]/page.tsx` and `catalog/page.tsx` — but the sitemap itself does not).
Rebuild the image (`docker build -t sonkei-app .`) after a significant catalog change if
sitemap accuracy matters for SEO.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (`postgresql://user:pass@host/db?sslmode=require`). |
| `NEXT_PUBLIC_SITE_URL` | recommended | Absolute site URL, used for metadata, sitemap, and absolute links. Defaults to `http://localhost:3000` if unset. |
| `CAPTCHA_SECRET` | recommended | HMAC secret signing the math-captcha tokens on login/register. If unset, a random secret is generated at process start (captcha still works, but invalidates on every restart/redeploy). |
| `NODE_ENV` | set by tooling | Standard Next.js env; affects cookie `secure` flags. |

Copy `.env.example` to `.env.local` and fill in real values — `.env.local` is gitignored.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server. |
| `npm run build` / `npm run start` | Production build / start. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run db:migrate` | Apply `db/schema.sql` (idempotent — safe to re-run). |
| `npm run db:seed` | Seed sample products, promo codes, and reviews. |
| `npm run import:products` | Bulk product import from a spreadsheet (see `scripts/import-products.mjs`). |
| `npm run make-admin -- <email>` | Promote an already-registered user to the `admin` role. |

## Roles (admin panel)

Four roles gate the `/api/admin/*` routes (see `src/lib/auth.ts` and each route's `ADMIN_ROLES`/`READ_ROLES`/`WRITE_ROLES` set):

- **admin** — full access, including store settings.
- **manager** — orders, deliveries, promo codes.
- **content** — products, images, descriptions, reviews moderation.
- **support** — read-only on orders/clients, no financial actions.

Promote the first admin with `npm run make-admin -- you@example.com` after registering normally.

## Business rules that are configurable at runtime

Stored in the `settings` table (single JSONB row), editable from the admin "Settings" tab — no redeploy needed:

- Loyalty tiers (Silk / Calm / Sora) and their paid-order thresholds.
- Bonus accrual rates per tier, max share of an order payable with bonuses.
- Bonus expiry window, and the fallback number of days after which a pending bonus accrual
  activates automatically even if the order's delivery was never marked complete.
- VAT/NDS rate used in receipts.

Defaults live in `src/lib/settings.ts` (`DEFAULT_SETTINGS`).

## Known gaps / not yet implemented

These require external service credentials and are intentionally out of scope until that
integration work is scheduled:

- **Online payment** (YooKassa/CloudPayments) — checkout currently creates orders as
  unpaid/manual; no payment gateway is wired in.
- **CDEK delivery integration** — delivery address/method is captured but not synced with a
  carrier API for live rates or tracking.
- **Email and Telegram notifications** — user notification preferences are stored and
  toggleable (`/api/account/notifications`), but no email/Telegram sending is implemented yet.
- **Analytics** (Yandex.Metrica / GA) — not wired in.

## Project structure

- `src/app/[locale]/...` — localized pages (App Router).
- `src/app/api/...` — REST-style API routes.
- `src/lib/...` — data-access and business logic (one module per domain: `orders`, `users`,
  `bonus`, `promos`, `settings`, etc.), all backed directly by SQL via `src/lib/db.ts`.
- `src/components/...` — UI components, split into `ui/` (primitives) and feature folders.
- `db/schema.sql` — full database schema, applied via `npm run db:migrate`.
