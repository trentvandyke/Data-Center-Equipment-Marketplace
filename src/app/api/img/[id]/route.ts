import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";

export const instant = false;

const uploadRoot = path.join(process.cwd(), "public", "uploads");

function contentTypeFor(url: string, bytes?: Buffer) {
  const lower = url.toLowerCase();
  if (lower.endsWith(".png") || (bytes && bytes[0] === 0x89 && bytes[1] === 0x50)) return "image/png";
  if (lower.endsWith(".webp") || (bytes && bytes.subarray(0, 4).toString("ascii") === "RIFF")) return "image/webp";
  if (lower.endsWith(".gif") || (bytes && bytes.subarray(0, 3).toString("ascii") === "GIF")) return "image/gif";
  return "image/jpeg";
}

function imageResponse(body: Buffer | ReadableStream<Uint8Array>, contentType: string) {
  return new Response(body as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || id.length > 80) return new Response("Not found", { status: 404 });
  const photo = await prisma.listingPhoto.findUnique({ where: { id }, select: { url: true } });
  if (!photo?.url) return new Response("Not found", { status: 404 });

  if (photo.url.startsWith("/uploads/")) {
    const relative = photo.url.slice("/uploads/".length);
    if (!relative || relative.includes("..") || path.isAbsolute(relative)) return new Response("Not found", { status: 404 });
    const full = path.resolve(uploadRoot, relative);
    if (!full.startsWith(`${uploadRoot}${path.sep}`)) return new Response("Not found", { status: 404 });
    try {
      const bytes = await readFile(full);
      return imageResponse(bytes, contentTypeFor(photo.url, bytes));
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  if (!photo.url.startsWith("http")) return new Response("Not found", { status: 404 });
  try {
    const upstream = await fetch(photo.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "GridAssetExchange image proxy", Accept: "image/*" },
    });
    if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });
    const headerType = upstream.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (headerType && !headerType.startsWith("image/")) return new Response("Not found", { status: 404 });
    return imageResponse(upstream.body, headerType || contentTypeFor(photo.url));
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
