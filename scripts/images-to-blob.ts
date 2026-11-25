import { PrismaClient } from "@prisma/client";
import { copyRemoteImage } from "../src/lib/storage";

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Set BLOB_READ_WRITE_TOKEN before copying listing photos to Vercel Blob.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const photos = await prisma.listingPhoto.findMany({
      where: {
        url: { startsWith: "http" },
        NOT: { url: { contains: ".blob.vercel-storage.com" } },
      },
      select: { id: true, url: true },
    });

    let copied = 0;
    let failed = 0;
    for (const photo of photos) {
      try {
        const stored = await copyRemoteImage(photo.url);
        if (!stored.copied) {
          failed += 1;
          console.log(`skip\t${photo.id}`);
          continue;
        }
        await prisma.listingPhoto.update({ where: { id: photo.id }, data: { url: stored.url } });
        copied += 1;
        console.log(`copied\t${photo.id}`);
      } catch (error) {
        failed += 1;
        console.log(`failed\t${photo.id}\t${error instanceof Error ? error.message : "failed"}`);
      }
    }

    console.log(`Copied ${copied} photos to Blob. ${failed} were left unchanged. ${photos.length} remote photos were considered.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
