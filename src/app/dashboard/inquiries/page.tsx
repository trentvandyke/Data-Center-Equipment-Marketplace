import { Suspense } from "react";
import { InquiryList } from "@/components/inquiry-list";
import { site } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toPublicListing } from "@/lib/public-copy";

export const instant = false;
export const metadata = { title: "Quotes" };

export default function InquiriesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading quotes…</p>}>
      <Inquiries />
    </Suspense>
  );
}

async function Inquiries() {
  const user = await requireUser();
  const sent = await prisma.inquiry.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          title: true,
          publicTitle: true,
          publicCode: true,
          description: true,
          publicDescription: true,
          location: true,
          publicLocation: true,
          manufacturer: true,
          externalSeller: true,
          slug: true,
        },
      },
    },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl">Quotes you sent</h1>
      <p className="mt-2 mb-4 text-sm text-muted">
        Every quote goes to {site.ownerName} at {site.legalName}.
      </p>
      <InquiryList
        inquiries={sent.map((inquiry) => {
          const view = toPublicListing(inquiry.listing);
          return {
            ...inquiry,
            listing: { title: view.code ? `${view.code} · ${view.title}` : view.title, slug: inquiry.listing.slug },
          };
        })}
        mode="sent"
      />
    </div>
  );
}
