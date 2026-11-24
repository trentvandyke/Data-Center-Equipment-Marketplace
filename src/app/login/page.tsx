import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DemoAccounts, LoginForm } from "@/components/forms/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/session-token";

export const instant = false;
export const metadata = { title: "Log in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-sm text-muted">Loading…</p>}>
      <LoginScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginScreen({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-serif text-4xl">Log in</h1>
      <p className="mt-2 mb-6 text-sm text-muted">Sellers manage listings and inquiries. Buyers can inquire without an account.</p>
      <LoginForm next={safeNext(params.next) ?? undefined} suspended={params.error === "suspended"} />
      {process.env.NODE_ENV !== "production" ? <DemoAccounts /> : null}
    </div>
  );
}
