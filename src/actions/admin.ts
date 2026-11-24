"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { hasId, listingStatuses } from "@/lib/catalog";
import { prisma } from "@/lib/db";

export async function moderateListing(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!hasId(listingStatuses, status)) return;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return;
  await prisma.listing.update({
    where: { id },
    data: { status, featured: formData.get("featured") === "on" },
  });
  revalidatePath("/");
  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function setUserSuspended(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;
  const suspended = formData.get("suspended") === "1";
  await prisma.user.update({ where: { id }, data: { suspended } });
  revalidatePath("/admin");
}
