// Vercel build: sync the Postgres schema, seed demo users and import the
// 2026-11-24 inventory snapshot only when the database is empty, then build.
import { execSync } from "node:child_process";

const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
// Prefer Neon's direct (unpooled) connection for schema changes and bulk import.
const direct = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const dbEnv = { DATABASE_URL: direct };

run("node scripts/ensure-env.mjs");
run("npx prisma generate");
run("npx prisma db push --skip-generate", dbEnv);

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: direct } } });
const [users, listings] = await Promise.all([prisma.user.count(), prisma.listing.count()]);
await prisma.$disconnect();
console.log(`Database has ${users} users and ${listings} listings.`);

if (users === 0) run("npx prisma db seed", dbEnv);
if (listings === 0) run("npx tsx scripts/import-inventory.ts data/inventory/recs_2026-11-24.json", dbEnv);

run("npx next build");
