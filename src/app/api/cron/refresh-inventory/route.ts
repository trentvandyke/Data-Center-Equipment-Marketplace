import { crawlSources } from "@/lib/crawl/run";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return Response.json({ error: "Set CRON_SECRET before enabling the refresh route." }, { status: 500 });
  }
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await crawlSources();
  return Response.json({
    ok: true,
    adapters: result.reports.length,
    fetched: result.reports.reduce((sum, report) => sum + report.fetched, 0),
    created: result.reports.reduce((sum, report) => sum + (report.imported?.created ?? 0), 0),
    updated: result.reports.reduce((sum, report) => sum + (report.imported?.updated ?? 0), 0),
  });
}
