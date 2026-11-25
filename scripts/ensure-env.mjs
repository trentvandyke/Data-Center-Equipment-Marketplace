import { copyFileSync, existsSync } from "node:fs";

if (process.env.AUTH_SECRET || existsSync(".env")) {
  process.exit(0);
}

if (process.env.VERCEL) {
  console.error("Set AUTH_SECRET and DATABASE_URL in the Vercel project environment.");
  process.exit(1);
}

copyFileSync(".env.example", ".env");
console.log("Created .env from .env.example");
