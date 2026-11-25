import { Suspense } from "react";
import { HomeMarket } from "@/components/home-market";
import { RequirementTool } from "@/components/match/requirement-tool";
import { freight } from "@/lib/freight";
import { payments } from "@/lib/payments";
import { site } from "@/lib/config";

export const instant = false;

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-copper">
              {site.legalName} · {site.headquarters}
            </p>
            <h1 className="mt-3 max-w-xl font-serif text-4xl leading-[1.1] text-ink sm:text-5xl">
              Surplus power gear for data centers, with the specs on the table.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-ink-soft">
              Switchgear, transformers, UPS systems, batteries, PDUs, generators, transfer switches, and the
              distribution equipment around them. New surplus and used.
            </p>
            <form action="/listings" className="mt-6 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="home-search">
                Search equipment
              </label>
              <input
                id="home-search"
                name="q"
                placeholder="Try Eaton, 480V, or Ashburn"
                className="field sm:flex-1"
              />
              <button className="btn btn-primary" type="submit">
                Search equipment
              </button>
            </form>
          </div>
          <RequirementTool />
        </div>
      </section>
      <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted">Loading the board…</p>}>
        <HomeMarket />
      </Suspense>
      <section id="how-it-works" className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <Step
            n="01"
            title="List the gear"
            body="Sellers post photos, a spec sheet, and optional test-report PDFs. Buyers can filter by voltage, rating, condition, and lead time."
          />
          <Step
            n="02"
            title="Request a quote"
            body={`The quote form goes to ${site.ownerName} at ${site.legalName}. We reply from the desk.`}
          />
          <Step
            n="03"
            title="Close off platform"
            body={`${payments.buyerMessage} ${freight.buyerMessage}`}
          />
        </div>
      </section>
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-serif text-2xl text-copper">{n}</p>
      <h2 className="mt-2 font-serif text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
