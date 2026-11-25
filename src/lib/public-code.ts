import { prisma } from "@/lib/db";
import { formatPublicCode, publicCodeSequence } from "@/lib/public-copy";

/** Next unused GAX-###### code. Legacy RB- numbers stay reserved so a remap cannot collide. */
export async function nextPublicCode() {
  const rows = await prisma.listing.findMany({
    where: {
      OR: [{ publicCode: { startsWith: "GAX-" } }, { publicCode: { startsWith: "RB-" } }],
    },
    select: { publicCode: true },
  });
  let sequence = 0;
  for (const row of rows) {
    const current = publicCodeSequence(row.publicCode);
    if (current != null && current > sequence) sequence = current;
  }
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const code = formatPublicCode(sequence + attempt);
    const taken = await prisma.listing.findUnique({ where: { publicCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  return formatPublicCode(sequence + 6);
}
