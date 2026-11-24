import Link from "next/link";
import { site } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-serif text-2xl">{site.name}</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-paper/70">{site.tagline}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/45">Operator</p>
          <p className="mt-2 text-sm">{site.legalName}</p>
          <p className="text-sm text-paper/70">{site.headquarters}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/45">Marketplace</p>
          <ul className="mt-2 space-y-1 text-sm text-paper/80">
            <li>
              <Link href="/listings">Browse equipment</Link>
            </li>
            <li>
              <Link href="/signup">Create an account</Link>
            </li>
            <li>
              <Link href="/#how-it-works">How inquiries work</Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-paper/50">
        © 2026 {site.legalName}. {site.name} is a working product name.
      </p>
    </footer>
  );
}
