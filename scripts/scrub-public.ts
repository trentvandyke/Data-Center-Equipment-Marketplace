import { PrismaClient } from "@prisma/client";
import { formatPublicCode, publicCopy } from "../src/lib/public-copy";

const prisma = new PrismaClient();

const listings = await prisma.listing.findMany({
  orderBy: { createdAt: "asc" },
  select: {
    id: true,
    publicCode: true,
    title: true,
    description: true,
    location: true,
    externalSeller: true,
  },
});

let sequence = 0;
for (const listing of listings) {
  const current = listing.publicCode?.match(/^RB-(\d+)$/);
  if (current) sequence = Math.max(sequence, Number(current[1]));
}

let assigned = 0;
let refreshed = 0;
for (const listing of listings) {
  let publicCode = listing.publicCode;
  if (!publicCode) {
    sequence += 1;
    publicCode = formatPublicCode(sequence);
    assigned += 1;
  }
  await prisma.listing.update({
    where: { id: listing.id },
    data: { publicCode, ...publicCopy(listing) },
  });
  refreshed += 1;
}

console.log(`Public copy refreshed for ${refreshed} listings. Assigned ${assigned} new RB- codes.`);
await prisma.$disconnect();
