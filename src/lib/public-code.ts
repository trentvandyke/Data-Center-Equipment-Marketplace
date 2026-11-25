import { prisma } from "@/lib/db";
import { formatPublicCode } from "@/lib/public-copy";

/** Next unused RB-###### code. Existing codes are left as they are. */
export async function nextPublicCode() {
  const latest = await prisma.listing.findFirst({
    where: { publicCode: { startsWith: "RB-" } },
    orderBy: { publicCode: "desc" },
    select: { publicCode: true },
  });
  let sequence = latest?.publicCode ? Number(latest.publicCode.slice(3)) : 0;
  if (!Number.isFinite(sequence)) sequence = 0;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const code = formatPublicCode(sequence + attempt);
    const taken = await prisma.listing.findUnique({ where: { publicCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  return formatPublicCode(sequence + 6);
}
