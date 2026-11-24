# Relayboard

Marketplace MVP for buying and selling new-surplus and used **data center electrical equipment**: switchgear, transformers, UPS systems and batteries, PDUs and RPPs, generators and paralleling gear, ATS/STS, busway, switchboards and panelboards, breakers, and related gear.

**Relayboard** is a working product name. Change it in one place: `name` inside [`src/lib/config.ts`](src/lib/config.ts). The operator is **Axiveris, LLC**, Bend, Oregon.

Payments and freight are intentionally off. Buyers send an inquiry; commercial terms happen between the parties. The seams for a later checkout or freight quote live in [`src/lib/payments.ts`](src/lib/payments.ts) and [`src/lib/freight.ts`](src/lib/freight.ts). File uploads go through [`src/lib/storage.ts`](src/lib/storage.ts).

## Stack

- [Next.js 16](https://nextjs.org/) App Router, React 19, TypeScript
- Tailwind CSS 4
- Prisma 6 with SQLite for local development (schema is portable to Postgres)
- Session auth: hashed passwords (`bcryptjs`) and an httpOnly JWT cookie (`jose`)
- Server Actions for signup, listings, inquiries, and moderation

## What works

- Home page with category tiles, featured listings, and recent listings
- Keyword search plus filters for category, manufacturer, condition, voltage class, rating, price, lead time, and location
- Listing page with a photo gallery, spec table, documents, seller card, and an inquiry form
- Seller and buyer accounts (sign up, log in, log out)
- Create, edit, and delete listings with multiple photos and PDF attachments
- Mark a listing sold or available again
- Seller dashboard for listings and incoming inquiries
- Admin view to hide or feature listings and to suspend users
- A sourced catalog of 2,388 real public dealer listings (snapshot dated 2026-11-24), labeled with the dealer and a link back to the original page
- Idempotent JSON/Excel import (CLI and admin upload) keyed on the source URL, with first seen / last seen dates and stale marking
- Daily crawl of the public dealer sites that allow it, plus a manual file drop for the rest
- Homepage one-line matcher: upload a diagram or paste a requirement, edit the extracted lines, and rank inventory. Requests land in the admin desk
- Seller accounts can still post their own listings, separate from sourced inventory

## Setup

Requires Node.js 20 or newer.

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` copies `.env.example` to `.env` when needed, creates the SQLite database, and loads sample data. Open [http://localhost:3000](http://localhost:3000).

Reset the database (this deletes listings and accounts):

```bash
npm run db:reset
```

### Demo accounts

These exist only after seeding. The login page shows them when `NODE_ENV` is not `production`.

| Role | Email | Password |
| --- | --- | --- |
| Seller | maya@cascadecritical.example | SellerDemo!2026 |
| Seller | james@ironcladsurplus.example | SellerDemo!2026 |
| Seller | priya@ashburnspares.example | SellerDemo!2026 |
| Buyer | dana@northlinecolo.example | BuyerDemo!2026 |
| Admin | admin@axiveris.example | AxiverisAdmin!2026 |

James at Ironclad Surplus already has sample inquiries on the Caterpillar generator and the ASCO transfer switch. Priya has one on the Liebert UPS.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run setup` | Create `.env`, generate Prisma client, push schema, seed |
| `npm run db:reset` | Wipe and reseed the database |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm start` | Run the production build |

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string. Local default is `file:./dev.db` (path is relative to `prisma/schema.prisma`). |
| `AUTH_SECRET` | Signs the session cookie. Use a long random value outside local demo. |

## Deploying to Vercel

SQLite and the local `public/uploads` folder will not persist on Vercel. Before a public deploy:

1. Create a Postgres database (Neon, Supabase, or Vercel Postgres).
2. In `prisma/schema.prisma`, set `provider = "postgresql"` and point `DATABASE_URL` at that database.
3. Set `DATABASE_URL` and a new `AUTH_SECRET` in the Vercel project. Do not reuse the demo secret.
4. Replace the disk adapter in `src/lib/storage.ts` with Vercel Blob or S3. Keep the `save` / `remove` calls.
5. Run `npx prisma db push` (or add migrations) against Postgres.
6. Do not seed the demo passwords into production. If you do, change them immediately and suspend the demo users from `/admin`.
7. Connect the Git repository in Vercel, or run `npx vercel`.

`next build` runs `prisma generate`. The app does not process card payments or book freight in this version.

## Project map

```text
prisma/schema.prisma          Users, listings, photos, documents, inquiries
prisma/seed.ts                Sample sellers, listings, and inquiries
src/app                       Routes: home, search, listing, auth, dashboard, admin
src/actions                   Server Actions (auth, listings, inquiries, admin)
src/lib/config.ts             Product name and operator
src/lib/catalog.ts            Categories, conditions, voltages, manufacturers
src/lib/storage.ts            Upload adapter
src/lib/payments.ts           Future checkout
src/lib/freight.ts            Future freight quotes
src/proxy.ts                  Requires a session for /dashboard and an admin role for /admin
```

## Real inventory

The checked-in snapshot is `data/inventory/recs_2026-11-24.json` (and the same rows in the Excel workbook beside it). `npm run setup` loads it after creating demo accounts. Load it again, or load a newer file:

```bash
npm run import:inventory -- data/inventory/recs_2026-11-24.json
npm run import:inventory -- path/to/newer-snapshot.xlsx
```

The same import is on `/admin` (sign in as the admin account). A file is treated as a full snapshot of every source site it contains. Listings from those sites whose URL is absent are marked stale and drop out of public search. Running the import twice does not duplicate rows.

Sourced listings show **Sourced from {dealer}**, **View original listing**, and **Ask us to source this**. Those requests are stored for the admin desk, not sent to the outside dealer automatically.

Demo seller accounts remain so someone can still post a listing. The old fictional sample equipment is no longer seeded.

## Daily refresh

```bash
npm run crawl                 # every adapter
npm run crawl -- cigroup      # one adapter id
```

Adapters that page a public catalog:

| Id | Site | Method |
| --- | --- | --- |
| arcbarn | Arcbarn | Sitemap plus JSON-LD on each listing. `CRAWL_PAGE_LIMIT` caps how many pages one run fetches. |
| cigroup, midwest, gruber, apasof, usadecom, atlas, pnw | CI Group, Midwest Engines & Generators, Gruber, APASOF, USA Decom, Atlas Electric, Pacific Northwest Power | WooCommerce Store API |
| farbazaar, proven, dces, gentel, turnkey, wpp | FAR Bazaar, Proven Performer, DCES, Gentel Power, Turnkey Industries, Worldwide Power Products | Public HTML, JSON-LD when the page has it |

A crawl upserts what it actually fetched. It does **not** mark the rest of a site stale unless `CRAWL_MARK_ABSENT=1` and the adapter finished the catalog. Use the daily file when you want removals. Sites that block anonymous fetch (Machinio, Surplus Record, eBay, MachineryTrader, Ritchie Bros, AllSurplus, Bid on Equipment, Power Generation Enterprises, and OEM lists such as T&R) are documented in `src/lib/crawl/adapters.ts` and are not crawled.

Politeness: a named user agent, `robots.txt` checks, and `CRAWL_MIN_DELAY_MS` (default 1000) between requests.

Scheduling:

- `vercel.json` calls `GET /api/cron/refresh-inventory` daily at 13:00 UTC. Set `CRON_SECRET`. Vercel sends `Authorization: Bearer $CRON_SECRET`. The serverless limit may be too short for a full Arcbarn pass; keep `CRAWL_PAGE_LIMIT` modest there.
- `.github/workflows/refresh-inventory.yml` runs `npm run crawl` daily. Add a `DATABASE_URL` secret (Postgres in production). Set `CRAWL_PAGE_LIMIT` high for a full pass.

## One-line matching

The homepage tool accepts a PDF, an image, or pasted text. With an API key it calls an OpenAI-compatible chat completions endpoint, including vision for images. Without a key it parses ratings, voltages, and category words, and you can edit or add lines before matching.

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Enables model extraction. Omit it to use the built-in parser. |
| `OPENAI_BASE_URL` | Default `https://api.openai.com/v1`. Point this at any compatible host. |
| `OPENAI_MODEL` | Default `gpt-4o-mini`. Use a vision-capable model for diagram images. |
| `CRON_SECRET` | Protects the daily refresh route. |
| `CRAWL_PAGE_LIMIT` | Max listing pages per adapter per run. `0` means no cap. Default `40`. |
| `CRAWL_MIN_DELAY_MS` | Pause between fetches. Default `1000`. |
| `CRAWL_MARK_ABSENT` | Set to `1` to let a finished crawl mark missing URLs stale. |
| `DATABASE_URL` | SQLite locally, Postgres in production. |
| `AUTH_SECRET` | Session cookie secret. |

Match scores live in `src/lib/match/score.ts`. `npm test` checks them against the real snapshot.

## Suggested next steps

- Lock the product name in `src/lib/config.ts`
- Move hosting to Postgres and object storage
- Email the seller when an inquiry arrives
- Optional review queue so new listings stay hidden until an admin approves them
- Implement `PaymentProvider` and `FreightProvider` when those workflows are in scope
- Seller verification, saved searches, and richer test-report metadata
