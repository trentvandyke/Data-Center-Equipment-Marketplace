import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignupForm } from "@/components/forms/auth-forms";
import { getCurrentUser } from "@/lib/auth";

export const instant = false;
export const metadata = { title: "Create an account" };

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-sm text-muted">Loading…</p>}>
      <SignupScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function SignupScreen({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-serif text-4xl">Create an account</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        Sellers need a company name. You can inquire on a listing without registering.
      </p>
      <SignupForm defaultRole={params.role === "seller" ? "SELLER" : "BUYER"} />
    </div>
  );
}
