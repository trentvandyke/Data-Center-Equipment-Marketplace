import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";

export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<div className="h-16" />}>
        <DashboardNav />
      </Suspense>
      <div className="mt-6">{children}</div>
    </div>
  );
}

async function DashboardNav() {
  const user = await getCurrentUser();
  if (!user) return null;
  const seller = user.role === "SELLER" || user.role === "ADMIN";
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">
          {user.company || "Account"}
        </p>
        <p className="font-serif text-3xl">{user.name}</p>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard" className="btn btn-ghost">
          Overview
        </Link>
        <Link href="/dashboard/inquiries" className="btn btn-ghost">
          Inquiries
        </Link>
        {seller ? (
          <Link href="/dashboard/listings/new" className="btn btn-primary">
            New listing
          </Link>
        ) : null}
        {user.role === "ADMIN" ? (
          <Link href="/admin" className="btn btn-ghost">
            Admin
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
