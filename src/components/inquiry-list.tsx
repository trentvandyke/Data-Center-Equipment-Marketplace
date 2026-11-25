import Link from "next/link";
import { markInquiryRead } from "@/actions/inquiries";
import { formatDate } from "@/lib/format";

export type InquiryItem = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string;
  quantityRequested: number | null;
  createdAt: Date;
  readAt: Date | null;
  listing: { title: string; slug: string };
};

export function InquiryList({
  inquiries,
  mode,
}: {
  inquiries: InquiryItem[];
  mode: "incoming" | "sent";
}) {
  if (inquiries.length === 0) {
    return (
      <p className="panel px-4 py-6 text-sm text-muted">
        {mode === "incoming" ? "No inquiries yet." : "You have not sent an inquiry from this account."}
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id} className="panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{formatDate(inquiry.createdAt)}</p>
              <p className="mt-1 font-medium">
                <Link href={`/listings/${inquiry.listing.slug}`} className="text-pine">
                  {inquiry.listing.title}
                </Link>
              </p>
            </div>
            {mode === "incoming" && !inquiry.readAt ? (
              <span className="rounded-full bg-copper/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-copper-dark">
                Unread
              </span>
            ) : null}
          </div>
          {mode === "incoming" ? (
            <p className="mt-3 text-sm">
              {inquiry.name}
              {inquiry.company ? ` · ${inquiry.company}` : ""}
            </p>
          ) : null}
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{inquiry.message}</p>
          {mode === "incoming" ? (
            <dl className="mt-3 grid gap-1 text-sm text-muted sm:grid-cols-2">
              <div>
                <dt className="inline">Email </dt>
                <dd className="inline">
                  <a className="font-medium text-pine" href={`mailto:${inquiry.email}`}>
                    {inquiry.email}
                  </a>
                </dd>
              </div>
              {inquiry.phone ? (
                <div>
                  <dt className="inline">Phone </dt>
                  <dd className="inline">{inquiry.phone}</dd>
                </div>
              ) : null}
              {inquiry.quantityRequested ? (
                <div>
                  <dt className="inline">Quantity </dt>
                  <dd className="inline">{inquiry.quantityRequested}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {mode === "incoming" && !inquiry.readAt ? (
            <form action={markInquiryRead} className="mt-3">
              <input type="hidden" name="id" value={inquiry.id} />
              <button className="btn btn-ghost" type="submit">
                Mark as read
              </button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
