import { PrismaClient } from "@prisma/client";
import { canonicalPublicCode, formatPublicCode, publicCodeSequence, publicCopy } from "../src/lib/public-copy";

async function main() {
  const prisma = new PrismaClient();
  try {
    const listings = await prisma.listing.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        publicCode: true,
        title: true,
        description: true,
        location: true,
        manufacturer: true,
        externalSeller: true,
      },
    });

    let sequence = 0;
    for (const listing of listings) {
      const current = publicCodeSequence(listing.publicCode);
      if (current != null) sequence = Math.max(sequence, current);
    }

    let assigned = 0;
    let remapped = 0;
    let refreshed = 0;
    for (const listing of listings) {
      let publicCode = listing.publicCode;
      const canonical = canonicalPublicCode(publicCode);
      if (canonical && canonical !== publicCode) {
        publicCode = canonical;
        remapped += 1;
      } else if (!publicCode) {
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

    console.log(
      `Public copy refreshed for ${refreshed} listings. Assigned ${assigned} new GAX- codes. Remapped ${remapped} RB- codes to GAX- with the same number.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
