import { Suspense } from "react";
import { ListingForm } from "@/components/forms/listing-form";
import { requireSeller } from "@/lib/auth";

export const instant = false;
export const metadata = { title: "New listing" };

export default function NewListingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading the listing form…</p>}>
      <NewListing />
    </Suspense>
  );
}

async function NewListing() {
  await requireSeller();
  return (
    <div>
      <h1 className="font-serif text-3xl">List equipment</h1>
      <p className="mt-2 mb-6 max-w-2xl text-sm text-muted">
        Add photos, the electrical rating, and any test reports. The listing goes live immediately. An admin can hide it later.
      </p>
      <ListingForm />
    </div>
  );
}
