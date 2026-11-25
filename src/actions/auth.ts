"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSession, clearSession } from "@/lib/session";
import { safeNext } from "@/lib/session-token";
import type { ActionState } from "@/lib/types";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(120),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(80).optional(),
  role: z.enum(["BUYER", "SELLER"]),
});

function blank(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    company: blank(formData.get("company")),
    phone: blank(formData.get("phone")),
    location: blank(formData.get("location")),
    role: formData.get("role") === "SELLER" ? "SELLER" : "BUYER",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (parsed.data.role === "SELLER" && !parsed.data.company) {
    return { fieldErrors: { company: ["Company is required to sell equipment."] } };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists. Log in instead." };
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      name: parsed.data.name,
      company: parsed.data.company ?? null,
      phone: parsed.data.phone ?? null,
      location: parsed.data.location ?? null,
      role: parsed.data.role,
    },
  });
  await createSession({ sub: user.id, role: user.role, email: user.email });
  redirect(user.role === "SELLER" ? "/dashboard/listings/new" : "/dashboard");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  if (user.suspended) {
    return { error: "This account is suspended. Contact the marketplace operator." };
  }
  await createSession({ sub: user.id, role: user.role, email: user.email });
  redirect(next ?? "/dashboard");
}

export async function logout() {
  await clearSession();
  redirect("/");
}

export async function becomeSeller() {
  const user = await requireUser();
  if (user.role === "BUYER") {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: "SELLER" },
    });
    await createSession({ sub: updated.id, role: updated.role, email: updated.email });
  }
  redirect("/dashboard/listings/new");
}
