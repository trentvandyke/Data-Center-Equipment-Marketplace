"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { canManageListing, requireSeller, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/format";
import { parseListingInput } from "@/lib/listing-input";
import {
  MAX_DOCUMENTS,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  extensionFor,
  isUploadedFile,
  sniffUpload,
  storage,
} from "@/lib/storage";
import type { ActionState } from "@/lib/types";

function safeFilename(name: string, fallback: string) {
  const base = name.split(/[/\\]/).pop()?.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (base || fallback).slice(0, 120);
}

async function uniqueSlug(title: string) {
  const base = slugify(title) || "listing";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = await prisma.listing.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function storeFiles(files: File[], folder: "photos" | "documents", allowed: "image" | "pdf", maxBytes: number) {
  const saved: string[] = [];
  for (const file of files) {
    if (file.size > maxBytes) {
      return { error: `${file.name} is too large.`, saved };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const kind = sniffUpload(bytes);
    const imageOk = kind === "image/jpeg" || kind === "image/png" || kind === "image/webp";
    const pdfOk = kind === "application/pdf";
    if (!kind || (allowed === "image" && !imageOk) || (allowed === "pdf" && !pdfOk)) {
      const expected = allowed === "image" ? "a JPG, PNG, or WebP" : "a PDF";
      return { error: `${file.name || "A file"} must be ${expected}.`, saved };
    }
    const stored = await storage.save(folder, bytes, extensionFor(kind));
    saved.push(stored.url);
  }
  return { saved };
}

export async function saveListing(listingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireSeller();
  const parsed = parseListingInput(formData, { allowStatus: Boolean(listingId) });
  if (!parsed.data) return { fieldErrors: parsed.fieldErrors };

  const existing = listingId
    ? await prisma.listing.findUnique({
        where: { id: listingId },
        include: { photos: true, documents: true },
      })
    : null;
  if (listingId && !existing) return { error: "That listing no longer exists." };
  if (existing && !canManageListing(user, existing)) return { error: "You cannot edit this listing." };
  if (existing && (existing.status === "HIDDEN" || existing.status === "REMOVED") && user.role !== "ADMIN") {
    return { error: "This listing is held for moderation and cannot be edited." };
  }

  const photoFiles = formData.getAll("photos").filter(isUploadedFile);
  const docFiles = formData.getAll("documents").filter(isUploadedFile);
  const removePhotoIds = new Set(formData.getAll("removePhoto").map(String));
  const removeDocIds = new Set(formData.getAll("removeDocument").map(String));
  const keptPhotos = (existing?.photos ?? []).filter((photo) => !removePhotoIds.has(photo.id));
  const keptDocs = (existing?.documents ?? []).filter((doc) => !removeDocIds.has(doc.id));

  if (keptPhotos.length + photoFiles.length < 1) {
    return { fieldErrors: { photos: ["Add at least one photo."] } };
  }
  if (keptPhotos.length + photoFiles.length > MAX_PHOTOS) {
    return { fieldErrors: { photos: [`Keep the gallery to ${MAX_PHOTOS} photos.`] } };
  }
  if (keptDocs.length + docFiles.length > MAX_DOCUMENTS) {
    return { fieldErrors: { documents: [`Attach up to ${MAX_DOCUMENTS} PDFs.`] } };
  }

  const photos = await storeFiles(photoFiles, "photos", "image", MAX_PHOTO_BYTES);
  if (photos.error || !photos.saved) {
    await Promise.all((photos.saved ?? []).map((url) => storage.remove(url)));
    return { fieldErrors: { photos: [photos.error ?? "Could not store photos."] } };
  }
  const documents = await storeFiles(docFiles, "documents", "pdf", MAX_DOCUMENT_BYTES);
  if (documents.error || !documents.saved) {
    await Promise.all([...photos.saved, ...(documents.saved ?? [])].map((url) => storage.remove(url)));
    return { fieldErrors: { documents: [documents.error ?? "Could not store documents."] } };
  }

  const input = parsed.data;
  const status =
    existing && (existing.status === "HIDDEN" || existing.status === "REMOVED")
      ? existing.status
      : (input.status ?? existing?.status ?? "ACTIVE");

  try {
    const saved = existing
      ? await prisma.listing.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            description: input.description,
            category: input.category,
            manufacturer: input.manufacturer,
            condition: input.condition,
            priceCents: input.requestQuote ? null : input.priceCents,
            quantity: input.quantity,
            location: input.location,
            voltageClass: input.voltageClass,
            ratingValue: input.ratingValue,
            ratingUnit: input.ratingUnit,
            phase: input.phase,
            frequencyHz: input.frequencyHz,
            year: input.year,
            model: input.model,
            serialNumber: input.serialNumber,
            leadTime: input.leadTime,
            status,
            photos: {
              deleteMany: { id: { in: [...removePhotoIds] } },
              create: photos.saved.map((url, index) => ({
                url,
                alt: input.title,
                sortOrder: keptPhotos.length + index,
              })),
            },
            documents: {
              deleteMany: { id: { in: [...removeDocIds] } },
              create: documents.saved.map((url, index) => ({
                url,
                filename: safeFilename(docFiles[index]?.name || "", `document-${index + 1}.pdf`),
                kind: input.documentKind,
              })),
            },
          },
        })
      : await prisma.listing.create({
          data: {
            sellerId: user.id,
            title: input.title,
            slug: await uniqueSlug(input.title),
            description: input.description,
            category: input.category,
            manufacturer: input.manufacturer,
            condition: input.condition,
            priceCents: input.requestQuote ? null : input.priceCents,
            quantity: input.quantity,
            location: input.location,
            voltageClass: input.voltageClass,
            ratingValue: input.ratingValue,
            ratingUnit: input.ratingUnit,
            phase: input.phase,
            frequencyHz: input.frequencyHz,
            year: input.year,
            model: input.model,
            serialNumber: input.serialNumber,
            leadTime: input.leadTime,
            status: "ACTIVE",
            origin: "POSTED",
            firstSeen: new Date(),
            isSample: false,
            photos: {
              create: photos.saved.map((url, index) => ({
                url,
                alt: input.title,
                sortOrder: index,
              })),
            },
            documents: {
              create: documents.saved.map((url, index) => ({
                url,
                filename: safeFilename(docFiles[index]?.name || "", `document-${index + 1}.pdf`),
                kind: input.documentKind,
              })),
            },
          },
        });

    const removedUrls = [
      ...(existing?.photos ?? []).filter((photo) => removePhotoIds.has(photo.id)).map((photo) => photo.url),
      ...(existing?.documents ?? []).filter((doc) => removeDocIds.has(doc.id)).map((doc) => doc.url),
    ];
    await Promise.all(removedUrls.map((url) => storage.remove(url)));

    revalidatePath("/");
    revalidatePath("/listings");
    revalidatePath(`/listings/${saved.slug}`);
    revalidatePath("/dashboard");
    redirect(`/listings/${saved.slug}`);
  } catch (error) {
    unstable_rethrow(error);
    await Promise.all([...photos.saved, ...documents.saved].map((url) => storage.remove(url)));
    console.error(error);
    return { error: "Could not save the listing. Try again." };
  }
}

export async function deleteListing(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { photos: true, documents: true },
  });
  if (!listing || !canManageListing(user, listing)) redirect("/dashboard");
  await prisma.listing.delete({ where: { id } });
  await Promise.all(
    [...listing.photos, ...listing.documents].map((file) => storage.remove(file.url)),
  );
  revalidatePath("/");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  redirect("/dashboard");
}

export async function setListingStatus(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "ACTIVE" && status !== "SOLD") redirect("/dashboard");
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || !canManageListing(user, listing)) redirect("/dashboard");
  if ((listing.status === "HIDDEN" || listing.status === "REMOVED") && user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  await prisma.listing.update({ where: { id }, data: { status } });
  revalidatePath("/");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/dashboard");
}
