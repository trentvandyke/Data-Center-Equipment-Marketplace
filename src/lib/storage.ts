import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * File storage seam.
 * The local adapter writes into public/uploads, which is fine for a single
 * Node server. On Vercel the filesystem is ephemeral — swap this module for
 * Vercel Blob or S3 and keep the same `save` / `remove` calls.
 */
export type StoredFile = { url: string };

export type FileStorage = {
  save(folder: "photos" | "documents", bytes: Buffer, extension: string): Promise<StoredFile>;
  remove(url: string): Promise<void>;
};

const uploadRoot = path.join(process.cwd(), "public", "uploads");

const contentTypeFor: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export const storage: FileStorage = {
  async save(folder, bytes, extension) {
    const name = `${crypto.randomUUID()}.${extension}`;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`${folder}/${name}`, bytes, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: contentTypeFor[extension] ?? "application/octet-stream",
      });
      return { url: blob.url };
    }
    const dir = path.join(uploadRoot, folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    return { url: `/uploads/${folder}/${name}` };
  },
  async remove(url) {
    if (process.env.BLOB_READ_WRITE_TOKEN && url.includes(".blob.vercel-storage.com")) {
      const { del } = await import("@vercel/blob");
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
      return;
    }
    if (!url.startsWith("/uploads/")) return;
    const relative = url.slice("/uploads/".length);
    if (!relative || relative.includes("..") || path.isAbsolute(relative)) return;
    const full = path.resolve(uploadRoot, relative);
    if (!full.startsWith(`${uploadRoot}${path.sep}`)) return;
    await unlink(full).catch(() => undefined);
  },
};

export type UploadKind = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function sniffUpload(bytes: Buffer): UploadKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

export function extensionFor(kind: UploadKind) {
  switch (kind) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
  }
}

export const MAX_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENTS = 4;
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

function extensionFromImage(bytes: Buffer, contentType: string) {
  if (contentType.includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50)) return "png";
  if (contentType.includes("webp") || bytes.subarray(0, 4).toString("ascii") === "RIFF") return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Copy a remote photo into our storage when BLOB_READ_WRITE_TOKEN is set.
 * The returned URL is ours. Callers that run without the token keep the remote
 * URL in the database; public pages still request it through /api/img/:id.
 */
export async function copyRemoteImage(remoteUrl: string): Promise<{ url: string; copied: boolean }> {
  if (!remoteUrl.startsWith("http")) return { url: remoteUrl, copied: false };
  if (remoteUrl.includes(".blob.vercel-storage.com")) return { url: remoteUrl, copied: false };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { url: remoteUrl, copied: false };
  const response = await fetch(remoteUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "GridAssetExchange image mirror", Accept: "image/*" },
  });
  if (!response.ok) throw new Error(`image download failed (${response.status})`);
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (contentType && !contentType.startsWith("image/")) throw new Error("image download was not an image");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 32 || bytes.length > 12 * 1024 * 1024) throw new Error("image download was an unexpected size");
  const saved = await storage.save("photos", bytes, extensionFromImage(bytes, contentType));
  return { url: saved.url, copied: true };
}

export function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}
