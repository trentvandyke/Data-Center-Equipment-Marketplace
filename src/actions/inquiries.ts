"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { site } from "@/lib/config";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { ActionState } from "@/lib/types";

const inquirySchema = z.object({
  listingId: z.string().min(1),
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(120),
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, "Add a few sentences so we can respond.").max(4000),
});

function blank(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export async function sendInquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (String(formData.get("website") ?? "").trim()) {
    return { success: "Inquiry sent." };
  }

  const parsed = inquirySchema.safeParse({
    listingId: formData.get("listingId"),
    name: formData.get("name"),
    email: formData.get("email"),
    company: blank(formData.get("company")),
    phone: blank(formData.get("phone")),
    message: formData.get("message"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const quantityRaw = blank(formData.get("quantityRequested"));
  let quantityRequested: number | null = null;
  if (quantityRaw) {
    const quantity = Number(quantityRaw);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return { fieldErrors: { quantityRequested: ["Enter a quantity from 1 to 999."] } };
    }
    quantityRequested = quantity;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listingId },
    select: { id: true, status: true },
  });
  if (!listing || listing.status !== "ACTIVE") {
    return { error: "This listing is not accepting inquiries." };
  }

  const session = await getSession();
  const buyer = session
    ? await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, suspended: true } })
    : null;

  await prisma.inquiry.create({
    data: {
      listingId: listing.id,
      buyerId: buyer && !buyer.suspended ? buyer.id : null,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      company: parsed.data.company ?? null,
      phone: parsed.data.phone ?? null,
      message: parsed.data.message,
      quantityRequested,
      kind: "LISTING",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inquiries");
  return { success: `Quote request sent to ${site.ownerName}.` };
}

export async function markInquiryRead(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: { listing: { select: { sellerId: true } } },
  });
  if (!inquiry) return;
  if (user.role !== "ADMIN") return;
  if (!inquiry.readAt) {
    await prisma.inquiry.update({ where: { id }, data: { readAt: new Date() } });
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inquiries");
}
