import { execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}

execSync("npx prisma generate && npx prisma db push && npx prisma db seed && npx tsx scripts/import-inventory.ts data/inventory/recs_2026-11-24.json && npx tsx scripts/scrub-public.ts", {
  stdio: "inherit",
});
