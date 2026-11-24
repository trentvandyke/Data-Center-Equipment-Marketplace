"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractText } from "unpdf";
import { z } from "zod";
import { extractEquipment } from "@/lib/match/extract";
import type { EquipmentNeed } from "@/lib/match/types";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/lib/types";

export type ExtractState = ActionState & {
  items?: EquipmentNeed[];
  source?: "model" | "parser";
  warning?: string;
};

const needSchema = z.object({
  label: z.string().trim().min(2).max(180),
  category: z.string().max(40),
  voltage: z.string().max(80),
  kw: z.number().nullable(),
  kva: z.number().nullable(),
  amps: z.number().nullable(),
  phase: z.string().nullable(),
  quantity: z.number().nullable(),
  manufacturer: z.string().nullable(),
  configuration: z.string().max(120),
  notes: z.string().max(500),
});

export async function extractRequirements(_prev: ExtractState, formData: FormData): Promise<ExtractState> {
  const typed = String(formData.get("description") ?? "");
  const file = formData.get("file");
  let pdfText = "";
  let image: { mime: string; base64: string } | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) return { error: "Keep the file under 8 MB." };
    const bytes = Buffer.from(await file.arrayBuffer());
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      try {
        const extracted = await extractText(new Uint8Array(bytes), { mergePages: true });
        pdfText = extracted.text;
      } catch {
        return { error: "Could not read that PDF. Paste the equipment list, or upload a page as an image." };
      }
      if (pdfText.trim().length < 40) {
        return {
          error: "That PDF has almost no text. Upload a screenshot of the one-line, or paste the equipment list.",
        };
      }
    } else if (file.type.startsWith("image/")) {
      image = { mime: file.type, base64: bytes.toString("base64") };
    } else {
      return { error: "Upload a PDF or an image." };
    }
  }
  const text = [typed, pdfText].filter((part) => part.trim()).join("\n\n");
  if (!text.trim() && !image) return { error: "Paste a description or upload a one-line." };
  const result = await extractEquipment({ text, image });
  if (result.items.length === 0) {
    return {
      error: "No equipment lines were found. Add a line yourself, or describe the voltage and rating.",
      warning: result.warning,
      items: [],
      source: result.source,
    };
  }
  return { items: result.items, warning: result.warning, source: result.source };
}

export async function saveMatchRun(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let items: EquipmentNeed[] = [];
  try {
    const parsed = z.array(needSchema).min(1).max(40).parse(JSON.parse(String(formData.get("items") ?? "[]")));
    items = parsed;
  } catch {
    return { error: "Add at least one equipment line with a label." };
  }
  const run = await prisma.matchRun.create({
    data: {
      inputText: String(formData.get("inputText") ?? "").slice(0, 20000),
      itemsJson: JSON.stringify(items),
    },
  });
  redirect(`/match/${run.id}`);
}

const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(2000).optional(),
  label: z.string().trim().min(2).max(240),
  listingId: z.string().min(1),
  score: z.coerce.number().int().optional(),
  reasons: z.string().max(2000).optional(),
});

export async function requestMatch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: blank(formData.get("company")),
    phone: blank(formData.get("phone")),
    message: blank(formData.get("message")),
    label: formData.get("label"),
    listingId: formData.get("listingId"),
    score: formData.get("score") || undefined,
    reasons: blank(formData.get("reasons")),
  });
  if (!parsed.success) return { error: "Enter your name and a work email." };
  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId }, select: { id: true } });
  if (!listing) return { error: "That listing is no longer available." };
  await prisma.lead.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      company: parsed.data.company ?? null,
      phone: parsed.data.phone ?? null,
      message: parsed.data.message ?? null,
      lines: {
        create: {
          label: parsed.data.label,
          listingId: listing.id,
          score: parsed.data.score ?? null,
          reasons: parsed.data.reasons ?? null,
        },
      },
    },
  });
  revalidatePath("/admin");
  return { success: "Request sent. Axiveris can see it in the admin desk." };
}

function blank(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}
