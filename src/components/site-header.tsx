import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/actions/auth";
import { site } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";

export function SiteHeader() {
  return (
    <header className="border-b border-black/20 bg-ink text-paper">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-card focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label={site.name} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/gax-logo-horizontal-white.svg"
              alt=""
              width={968}
              height={256}
              className="hidden h-12 w-auto md:block"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/gax-icon-white.svg" alt="" width={64} height={64} className="h-9 w-9 md:hidden" />
          </Link>
          <form action="/listings" className="hidden min-w-0 flex-1 md:block">
            <label className="sr-only" htmlFor="header-search">
              Search equipment
            </label>
            <input
              id="header-search"
              name="q"
              placeholder="Search switchgear, UPS, transformers, generators…"
              className="w-full rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-paper placeholder:text-paper/45"
            />
          </form>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/listings" className="hidden hover:text-white sm:inline">
              Browse
            </Link>
            <Link href="/dashboard/listings/new" className="hidden hover:text-white sm:inline">
              Sell
            </Link>
            <Suspense fallback={<span className="text-paper/50">Account</span>}>
              <AccountMenu />
            </Suspense>
          </nav>
        </div>
        <form action="/listings" className="mt-3 md:hidden">
          <label className="sr-only" htmlFor="header-search-mobile">
            Search equipment
          </label>
          <input
            id="header-search-mobile"
            name="q"
            placeholder="Search equipment"
            className="w-full rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-paper placeholder:text-paper/45"
          />
        </form>
        <div className="mt-3 flex gap-4 text-sm sm:hidden">
          <Link href="/listings">Browse</Link>
          <Link href="/dashboard/listings/new">Sell</Link>
        </div>
      </div>
    </header>
  );
}

async function AccountMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <span className="flex items-center gap-3">
        <Link href="/login">Log in</Link>
        <Link href="/signup" className="rounded-full bg-copper px-3 py-1.5 font-semibold text-white">
          Sign up
        </Link>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-3">
      <Link href="/dashboard" className="max-w-40 truncate font-medium">
        {user.name}
      </Link>
      {user.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
      <form action={logout}>
        <button type="submit" className="text-paper/70 hover:text-white">
          Log out
        </button>
      </form>
    </span>
  );
}
