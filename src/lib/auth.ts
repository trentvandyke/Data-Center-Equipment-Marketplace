import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { clearSession } from "@/lib/session";
import { getSession } from "@/lib/session";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || user.suspended) return null;
  return user;
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) {
    await clearSession();
    redirect("/login");
  }
  if (user.suspended) {
    await clearSession();
    redirect("/login?error=suspended");
  }
  return user;
}

export async function requireSeller() {
  const user = await requireUser();
  if (user.role !== "SELLER" && user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export function canManageListing(user: { id: string; role: string }, listing: { sellerId: string | null }) {
  return user.role === "ADMIN" || (listing.sellerId != null && user.id === listing.sellerId);
}
