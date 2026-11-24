import { Suspense } from "react";
import { InquiryList } from "@/components/inquiry-list";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const instant = false;
export const metadata = { title: "Inquiries" };

export default function InquiriesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading inquiries…</p>}>
      <Inquiries />
    </Suspense>
  );
}

async function Inquiries() {
  const user = await requireUser();
  const seller = user.role === "SELLER" || user.role === "ADMIN";
  const [incoming, sent] = await Promise.all([
    seller
      ? prisma.inquiry.findMany({
          where: { listing: { sellerId: user.id } },
          orderBy: { createdAt: "desc" },
          include: { listing: { select: { title: true, slug: true } } },
        })
      : Promise.resolve([]),
    prisma.inquiry.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { listing: { select: { title: true, slug: true } } },
    }),
  ]);

  return (
    <div className="grid gap-10">
      {seller ? (
        <section>
          <h1 className="font-serif text-3xl">Inquiries on your listings</h1>
          <p className="mt-2 mb-4 text-sm text-muted">Reply from your own email. Messages stay in this dashboard.</p>
          <InquiryList inquiries={incoming} mode="incoming" />
        </section>
      ) : (
        <h1 className="font-serif text-3xl">Your inquiries</h1>
      )}
      <section>
        <h2 className="mb-4 font-serif text-2xl">Sent while you were logged in</h2>
        <InquiryList inquiries={sent} mode="sent" />
      </section>
    </div>
  );
}
