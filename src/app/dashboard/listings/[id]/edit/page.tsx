import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingForm, type ListingFormValues } from "@/components/forms/listing-form";
import { canManageListing, requireSeller } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const instant = false;
export const metadata = { title: "Edit listing" };

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading listing…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSeller();
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      documents: { orderBy: { filename: "asc" } },
    },
  });
  if (!listing || !canManageListing(user, listing)) notFound();
  if ((listing.status === "HIDDEN" || listing.status === "REMOVED") && user.role !== "ADMIN") {
    return (
      <p className="panel px-4 py-6 text-sm">
        This listing is held for moderation. Contact the marketplace operator if you think that is a mistake.
      </p>
    );
  }

  const values: ListingFormValues = {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    manufacturer: listing.manufacturer,
    condition: listing.condition,
    priceCents: listing.priceCents,
    quantity: listing.quantity,
    location: listing.location,
    voltageClass: listing.voltageClass,
    ratingValue: listing.ratingValue,
    ratingUnit: listing.ratingUnit,
    phase: listing.phase,
    frequencyHz: listing.frequencyHz,
    year: listing.year,
    model: listing.model,
    serialNumber: listing.serialNumber,
    leadTime: listing.leadTime,
    description: listing.description,
    status: listing.status,
    photos: listing.photos.map((photo) => ({ id: photo.id, url: photo.url, alt: photo.alt })),
    documents: listing.documents.map((doc) => ({ id: doc.id, filename: doc.filename, kind: doc.kind })),
  };

  return (
    <div>
      <h1 className="font-serif text-3xl">Edit listing</h1>
      <p className="mt-2 mb-6 text-sm text-muted">{listing.title}</p>
      <ListingForm listing={values} />
    </div>
  );
}
