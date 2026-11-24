import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">404</p>
      <h1 className="mt-2 font-serif text-4xl">That listing is not on the board.</h1>
      <p className="mt-3 text-muted">It may have been removed, or the link is out of date.</p>
      <Link href="/listings" className="btn btn-primary mt-6">
        Browse equipment
      </Link>
    </div>
  );
}
