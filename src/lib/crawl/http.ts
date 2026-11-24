const USER_AGENT = "RelayboardBot/0.1 (+https://relayboard.example/bot; Axiveris LLC public inventory refresh)";

export function crawlDelayMs() {
  const configured = Number(process.env.CRAWL_MIN_DELAY_MS ?? 1000);
  return Number.isFinite(configured) ? Math.max(250, configured) : 1000;
}

export function crawlPageLimit() {
  const configured = Number(process.env.CRAWL_PAGE_LIMIT ?? 40);
  if (!Number.isFinite(configured)) return 40;
  return configured <= 0 ? Number.POSITIVE_INFINITY : configured;
}

export async function politeFetch(url: string, delayMs = crawlDelayMs(), timeoutMs = 20000) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json,application/xml;q=0.9,*/*;q=0.8" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  return response;
}

export async function fetchText(url: string, delayMs?: number) {
  const response = await politeFetch(url, delayMs);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return { text: await response.text(), headers: response.headers, finalUrl: response.url };
}

/** Minimal robots.txt check: Disallow rules for User-agent: * that match the path. */
export function robotsAllows(robotsText: string, path: string) {
  const lines = robotsText.split(/\r?\n/);
  let applies = false;
  const disallows: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key)) {
      applies = value === "*";
      continue;
    }
    if (applies && /^disallow$/i.test(key) && value) disallows.push(value);
  }
  return !disallows.some((rule) => rule !== "/" && path.startsWith(rule));
}

export async function allowed(url: string) {
  const parsed = new URL(url);
  try {
    const robots = await fetchText(`${parsed.origin}/robots.txt`, 0);
    return robotsAllows(robots.text, parsed.pathname);
  } catch {
    return true;
  }
}
