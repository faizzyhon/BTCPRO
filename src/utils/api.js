import { API_TIMEOUT_MS, CORS_PROXIES, NEWS_KEYWORDS, CRYPTOCOMPARE_NEWS_URL } from "../constants.js";

// ─── Core fetch helpers ───────────────────────────────────────────────────────

export async function fetchJson(url, timeoutMs = API_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(id);
  }
}

export async function fetchWithRetry(url, retries = 1, timeoutMs = API_TIMEOUT_MS) {
  for (let i = 0; i <= retries; i++) {
    try { return await fetchJson(url, timeoutMs); } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
}

// ─── Price aggregation ────────────────────────────────────────────────────────

export async function fetchTickerAggregated(sources) {
  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const data = await fetchJson(src.url);
      const t = src.normalize(data);
      if (!Number.isFinite(t.price) || t.price <= 0) throw new Error("bad price");
      return { source: src.name, ...t };
    })
  );
  const valid = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (!valid.length) throw new Error("All price sources failed");
  const prices = valid.map((v) => v.price).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const spread = prices.at(-1) - prices[0];
  return { ...valid[0], price: medianPrice, spread, sources: valid, sourceCount: valid.length };
}

// ─── Klines ───────────────────────────────────────────────────────────────────

export async function fetchKlines(url) {
  const data = await fetchJson(url);
  return data.map((k) => ({
    time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4],
    volume: +k[5], closeTime: k[6],
  }));
}

// ─── Funding / OI ─────────────────────────────────────────────────────────────

export async function fetchFunding() {
  try {
    const d = await fetchJson("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT", 5_000);
    return {
      fundingRate: +d.lastFundingRate * 100,
      nextFundingTime: +d.nextFundingTime,
      markPrice: +d.markPrice,
      indexPrice: +d.indexPrice,
    };
  } catch { return null; }
}

export async function fetchOpenInterest() {
  try {
    const d = await fetchJson("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT", 5_000);
    return { openInterest: +d.openInterest };
  } catch { return null; }
}

// ─── News — CryptoCompare (primary, no proxy needed) ─────────────────────────

function scoreTitle(text) {
  const low = text.toLowerCase();
  return NEWS_KEYWORDS.reduce((s, [kw, w]) => (low.includes(kw.toLowerCase()) ? s + w : s), 1);
}

function matchTags(text) {
  return NEWS_KEYWORDS
    .filter(([kw]) => text.toLowerCase().includes(kw.toLowerCase()))
    .slice(0, 4).map(([kw]) => kw);
}

export async function fetchCryptoCompareNews() {
  const data = await fetchJson(CRYPTOCOMPARE_NEWS_URL, 8_000);
  const items = data?.Data || [];
  return items.map((n) => {
    const score = scoreTitle(`${n.title} ${n.body || ""}`) + 2;
    return {
      id: `cc-${n.id}`,
      source: n.source_info?.name || n.source || "CryptoCompare",
      title: n.title,
      link: n.url || n.guid || "#",
      pubDate: new Date(n.published_on * 1000).toISOString(),
      score,
      impact: score >= 10 ? "HIGH" : score >= 6 ? "MED" : "LOW",
      tags: matchTags(`${n.title} ${n.body || ""}`),
      imageUrl: n.imageurl || null,
    };
  }).sort((a, b) => b.score - a.score);
}

// ─── News — RSS via CORS proxy fallback ──────────────────────────────────────

function decodeXml(text) {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function fetchWithProxy(url, timeoutMs = 6_000) {
  for (const proxy of CORS_PROXIES) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      clearTimeout(id);
      return text;
    } catch {
      clearTimeout(id);
      // try next proxy
    }
  }
  throw new Error("All CORS proxies failed");
}

export async function fetchNewsFeed(feed) {
  const xml = await fetchWithProxy(feed.url);
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return Array.from(doc.querySelectorAll("item")).slice(0, 5).map((item) => {
    const title = decodeXml(item.querySelector("title")?.textContent || "Update");
    const link  = item.querySelector("link")?.textContent?.trim() || "#";
    const desc  = decodeXml(item.querySelector("description")?.textContent || "");
    const pubDate = item.querySelector("pubDate")?.textContent || "";
    const score = scoreTitle(`${title} ${desc}`) + feed.weight;
    return {
      id: `${feed.source}-${title.slice(0, 40)}`,
      source: feed.source,
      title, link, pubDate,
      score,
      impact: score >= 10 ? "HIGH" : score >= 6 ? "MED" : "LOW",
      tags: matchTags(`${title} ${desc}`),
    };
  });
}

// ─── Aggregate news — CC primary, RSS as supplement ──────────────────────────

export async function fetchAllNews(feeds) {
  // Always try CryptoCompare first — it's direct JSON, no proxy
  let ccNews = [];
  try { ccNews = await fetchCryptoCompareNews(); } catch { /* fallback only */ }

  // RSS feeds in parallel, each independently — failures silently dropped
  const rssResults = await Promise.allSettled(feeds.map(fetchNewsFeed));
  const rssNews = rssResults
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Merge, deduplicate by title similarity, sort by score
  const all = [...ccNews, ...rssNews];
  const seen = new Set();
  return all
    .filter((n) => {
      const key = n.title.slice(0, 50).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 80);
}
