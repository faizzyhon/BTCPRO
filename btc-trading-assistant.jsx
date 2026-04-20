import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BINANCE_KLINES_URL = (interval) =>
  `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=240`;
const BINANCE_WS_URL = (interval) =>
  `wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/btcusdt@kline_${interval}`;
const REFRESH_MS = 15_000;
const API_TIMEOUT_MS = 6_000;
const DEFAULT_OLLAMA_MODEL = "lfm2.5-thinking";
const TIMEFRAMES = [
  { label: "1m", value: "1m" },
  { label: "3m", value: "3m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
];
const NEWS_FEEDS = [
  {
    source: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    weight: 4,
  },
  {
    source: "The Block",
    url: "https://www.theblock.co/rss.xml",
    weight: 4,
  },
  {
    source: "Decrypt",
    url: "https://decrypt.co/feed",
    weight: 3,
  },
  {
    source: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
    weight: 3,
  },
  {
    source: "ForexLive",
    url: "https://www.forexlive.com/feed/news",
    weight: 5,
  },
  {
    source: "Investing.com Economy",
    url: "https://www.investing.com/rss/news_25.rss",
    weight: 4,
  },
  {
    source: "CNBC Markets",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    weight: 4,
  },
  {
    source: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    weight: 5,
  },
  {
    source: "SEC",
    url: "https://www.sec.gov/news/pressreleases.rss",
    weight: 5,
  },
  {
    source: "BLS CPI",
    url: "https://www.bls.gov/feed/news_release/cpi.rss",
    weight: 5,
  },
];
const NEWS_KEYWORDS = [
  ["ETF", 4],
  ["Fed", 4],
  ["rate", 3],
  ["inflation", 3],
  ["CPI", 4],
  ["SEC", 4],
  ["regulation", 3],
  ["liquidation", 4],
  ["whale", 3],
  ["miner", 2],
  ["reserve", 3],
  ["BlackRock", 4],
  ["MicroStrategy", 3],
  ["hack", 4],
  ["war", 4],
  ["tariff", 3],
];
const STORAGE_KEYS = {
  trades: "btc-assistant.trades.v2",
  dailyLoss: "btc-assistant.dailyLoss.v2",
  weeklyLoss: "btc-assistant.weeklyLoss.v2",
  balance: "btc-assistant.balance.v2",
  model: "btc-assistant.ollamaModel.v2",
};
const UPCOMING_EVENTS = [
  {
    title: "US CPI inflation release",
    window: "Next scheduled macro print",
    impact: "HIGH",
    direction: "Hot CPI can pressure BTC down; soft CPI can support risk-on upside.",
  },
  {
    title: "Federal Reserve rate decision / minutes",
    window: "Next FOMC cycle",
    impact: "HIGH",
    direction: "Hawkish tone can lift yields and weaken BTC; dovish tone can lift BTC.",
  },
  {
    title: "US spot BTC ETF flow reports",
    window: "Daily after US close",
    impact: "HIGH",
    direction: "Strong net inflows can support BTC; outflows can pressure price.",
  },
  {
    title: "Options expiry and liquidation clusters",
    window: "Weekly Friday / high leverage periods",
    impact: "MED",
    direction: "Large open interest can trigger fast wick moves near max-pain zones.",
  },
  {
    title: "Gold and silver breakout watch",
    window: "During macro/risk-off sessions",
    impact: "MED",
    direction: "Strong metals plus weak dollar can support BTC narrative; panic metals bid can reduce crypto risk appetite.",
  },
];
const MACRO_SOURCES = [
  { key: "gold", label: "Gold", symbol: "xauusd" },
  { key: "silver", label: "Silver", symbol: "xagusd" },
  { key: "spx", label: "S&P 500", symbol: "spy.us" },
  { key: "nasdaq", label: "Nasdaq", symbol: "qqq.us" },
];
const MARKET_SOURCES = [
  {
    name: "Binance",
    url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
    normalize: (data) => ({
      price: Number(data.lastPrice),
      change24h: Number(data.priceChangePercent),
      volume: Number(data.quoteVolume),
    }),
  },
  {
    name: "Coinbase",
    url: "https://api.exchange.coinbase.com/products/BTC-USD/stats",
    normalize: (data) => {
      const open = Number(data.open);
      const price = Number(data.last);
      return {
        price,
        change24h: open ? ((price - open) / open) * 100 : 0,
        volume: Number(data.volume) * price,
      };
    },
  },
  {
    name: "Kraken",
    url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
    normalize: (data) => {
      const ticker = data.result?.XXBTZUSD || data.result?.XBTUSD || Object.values(data.result || {})[0];
      const price = Number(ticker?.c?.[0]);
      const open = Number(ticker?.o);
      return {
        price,
        change24h: open ? ((price - open) / open) * 100 : 0,
        volume: Number(ticker?.v?.[1]) * price,
      };
    },
  },
  {
    name: "CoinGecko",
    url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true",
    normalize: (data) => ({
      price: Number(data.bitcoin?.usd),
      change24h: Number(data.bitcoin?.usd_24h_change),
      volume: Number(data.bitcoin?.usd_24h_vol),
    }),
  },
];
const OLLAMA_URL = "/ollama";

const GREEN = "#19d37d";
const RED = "#ff4d5f";
const AMBER = "#f6b84b";
const INK = "#f6f7f8";
const MUTED = "#8e949c";
const PANEL = "rgba(17, 19, 22, 0.82)";
const LINE = "rgba(255,255,255,0.09)";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace";
const SANS = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function compactUsd(value, digits = 0) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
  }).format(value);
}

function number(value, digits = 2) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calcSMA(values, period) {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((sum, item) => sum + item, 0) / period;
}

function calcEMA(values, period) {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  return values.reduce((ema, price, index) => (index === 0 ? price : price * k + ema * (1 - k)), values[0]);
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcBollinger(closes, period = 20, mult = 2) {
  if (closes.length < period) return { upper: 0, mid: 0, lower: 0, width: 0 };
  const slice = closes.slice(-period);
  const mid = slice.reduce((sum, price) => sum + price, 0) / period;
  const variance = slice.reduce((sum, price) => sum + (price - mid) ** 2, 0) / period;
  const dev = Math.sqrt(variance);
  return {
    upper: mid + dev * mult,
    mid,
    lower: mid - dev * mult,
    width: mid ? ((dev * mult * 2) / mid) * 100 : 0,
  };
}

function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return 0;
  const recent = candles.slice(-period);
  const trueRanges = recent.map((candle, index) => {
    const prevClose = candles[candles.length - period + index - 1]?.close ?? candle.close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - prevClose),
      Math.abs(candle.low - prevClose),
    );
  });
  return trueRanges.reduce((sum, item) => sum + item, 0) / period;
}

function lineSeries(values, period) {
  return values.map((_, index) => {
    if (index < period - 1) return null;
    const slice = values.slice(index - period + 1, index + 1);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  });
}

function buildFallbackCandles() {
  const now = Date.now();
  let price = 94750;
  return Array.from({ length: 180 }, (_, index) => {
    const drift = Math.sin(index / 8) * 210 + Math.cos(index / 19) * 155;
    const noise = Math.sin(index * 1.87) * 95;
    const open = price;
    const close = open + drift * 0.18 + noise;
    const high = Math.max(open, close) + 220 + Math.abs(Math.sin(index)) * 160;
    const low = Math.min(open, close) - 220 - Math.abs(Math.cos(index)) * 160;
    price = close;
    return {
      time: now - (179 - index) * 60 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume: 2400 + Math.abs(Math.sin(index / 4)) * 1800,
    };
  });
}

function getImpactScore(text) {
  const normalized = text.toLowerCase();
  return NEWS_KEYWORDS.reduce((score, [keyword, weight]) => (
    normalized.includes(keyword.toLowerCase()) ? score + weight : score
  ), 1);
}

function getImpactLabel(score) {
  if (score >= 9) return "HIGH";
  if (score >= 5) return "MED";
  return "LOW";
}

function decodeXmlText(text) {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readStored(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getStoredOllamaModel() {
  const stored = readStored(STORAGE_KEYS.model, DEFAULT_OLLAMA_MODEL);
  if (!stored || stored === "gemma4" || stored === "llama3.2") return DEFAULT_OLLAMA_MODEL;
  return stored;
}

function writeStored(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is best-effort in private or restricted WebViews.
  }
}

function parseNewsFeed(xml, source, sourceWeight = 1) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return Array.from(doc.querySelectorAll("item")).slice(0, 7).map((item) => {
    const title = decodeXmlText(item.querySelector("title")?.textContent || "Market update");
    const link = item.querySelector("link")?.textContent || "#";
    const publishedAt = item.querySelector("pubDate")?.textContent || "";
    const description = decodeXmlText(item.querySelector("description")?.textContent || "");
    const score = getImpactScore(`${title} ${description}`) + sourceWeight;
    return {
      id: `${source}-${title}`,
      source,
      sourceWeight,
      title,
      link,
      publishedAt,
      impact: getImpactLabel(score),
      score,
      reason: NEWS_KEYWORDS
        .filter(([keyword]) => `${title} ${description}`.toLowerCase().includes(keyword.toLowerCase()))
        .slice(0, 3)
        .map(([keyword]) => keyword)
        .join(", ") || "general sentiment",
    };
  });
}

function updateIndicatorSet(candleSet) {
  const closes = candleSet.map((candle) => candle.close);
  const bb = calcBollinger(closes);
  return {
    rsi: calcRSI(closes),
    sma20: calcSMA(closes, 20),
    ema21: calcEMA(closes.slice(-90), 21),
    ema55: calcEMA(closes.slice(-130), 55),
    bbUpper: bb.upper,
    bbMid: bb.mid,
    bbLower: bb.lower,
    bbWidth: bb.width,
    atr: calcATR(candleSet),
  };
}

function buildSuggestedSetup({ ticker, indicators, marketView, timeframe, riskAmount }) {
  const price = ticker.price || 0;
  const atr = indicators.atr || price * 0.004 || 250;
  const direction = marketView.bias === "SHORT" ? "SHORT" : "LONG";
  const confidenceBuffer = clamp((marketView.confidence - 50) / 100, 0.05, 0.35);
  const entryLow = direction === "LONG" ? price - atr * (0.22 + confidenceBuffer) : price - atr * 0.08;
  const entryHigh = direction === "LONG" ? price + atr * 0.08 : price + atr * (0.22 + confidenceBuffer);
  const entryMid = (entryLow + entryHigh) / 2;
  const stop = direction === "LONG" ? entryMid - atr * 1.35 : entryMid + atr * 1.35;
  const riskDistance = Math.abs(entryMid - stop);
  const tp1 = direction === "LONG" ? entryMid + riskDistance * 1.5 : entryMid - riskDistance * 1.5;
  const tp2 = direction === "LONG" ? entryMid + riskDistance * 3 : entryMid - riskDistance * 3;
  return {
    id: `setup-${timeframe}-${Math.round(price)}-${Math.round(Date.now() / 1000)}`,
    direction,
    timeframe,
    entryLow,
    entryHigh,
    entryMid,
    stop,
    tp1,
    tp2,
    riskAmount,
    confidence: marketView.confidence,
    reason: marketView.summary,
    createdAt: new Date().toISOString(),
  };
}

function getTradePnl(trade, exitPrice) {
  const directionMult = trade.direction === "LONG" ? 1 : -1;
  return (exitPrice - trade.entry) * directionMult * trade.sizeBtc;
}

function buildFearPoint({ ticker, indicators, marketView, news, macro }) {
  const highImpactNews = news.filter((item) => item.impact === "HIGH").length;
  const metalsRisk = (macro.gold?.change || 0) > 0.35 && ticker.change24h < 0 ? 8 : 0;
  const score = clamp(
    50
      - ticker.change24h * 3
      + (indicators.rsi > 70 ? 10 : 0)
      - (indicators.rsi < 30 ? 10 : 0)
      + highImpactNews * 6
      + indicators.bbWidth * 0.7
      + metalsRisk
      - (marketView.bias === "LONG" ? 6 : marketView.bias === "SHORT" ? -2 : 0),
    0,
    100,
  );
  return {
    time: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
    score: Math.round(score),
  };
}

async function fetchJson(url, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchTickerFromSources() {
  const attempts = await Promise.allSettled(MARKET_SOURCES.map(async (source) => {
    const data = await fetchJson(source.url);
    const ticker = source.normalize(data);
    if (!Number.isFinite(ticker.price) || ticker.price <= 0) {
      throw new Error("missing price");
    }
    return {
      source: source.name,
      price: ticker.price,
      change24h: Number.isFinite(ticker.change24h) ? ticker.change24h : 0,
      volume: Number.isFinite(ticker.volume) ? ticker.volume : 0,
    };
  }));

  for (const attempt of attempts) {
    if (attempt.status === "fulfilled") return attempt.value;
  }

  const errors = attempts.map((attempt, index) => {
    const reason = attempt.reason?.message || "unknown error";
    return `${MARKET_SOURCES[index].name}: ${reason}`;
  });
  throw new Error(errors.join("; "));
}

async function fetchTickerFast() {
  const errors = [];
  const pending = MARKET_SOURCES.map((source) => ({
    source,
    promise: fetchJson(source.url)
      .then((data) => source.normalize(data))
      .then((ticker) => {
        if (!Number.isFinite(ticker.price) || ticker.price <= 0) {
          throw new Error("missing price");
        }
        return {
          source: source.name,
          price: ticker.price,
          change24h: Number.isFinite(ticker.change24h) ? ticker.change24h : 0,
          volume: Number.isFinite(ticker.volume) ? ticker.volume : 0,
        };
      }),
  }));

  while (pending.length) {
    try {
      return await Promise.race(pending.map((item) => item.promise));
    } catch (error) {
      const failedIndex = await Promise.race(
        pending.map((item, index) => item.promise.then(() => -1, () => index)),
      );
      if (failedIndex >= 0) {
        errors.push(`${pending[failedIndex].source.name}: ${error.message}`);
        pending.splice(failedIndex, 1);
      } else {
        throw error;
      }
    }
  }

  throw new Error(errors.join("; "));
}

async function fetchBinanceCandles(interval) {
  const data = await fetchJson(BINANCE_KLINES_URL(interval));
  return data.map((row) => ({
    time: row[0],
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
}

async function fetchMarketNews() {
  const attempts = await Promise.allSettled(NEWS_FEEDS.map(async (feed) => {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`;
    const xml = await fetch(proxyUrl, { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    });
    return parseNewsFeed(xml, feed.source, feed.weight || 1);
  }));

  const stories = attempts
    .filter((attempt) => attempt.status === "fulfilled")
    .flatMap((attempt) => attempt.value)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (!stories.length) throw new Error("news feeds unavailable");
  return stories;
}

async function fetchMacroSnapshot() {
  const settled = await Promise.allSettled(MACRO_SOURCES.map(async (source) => {
    const url = `https://stooq.com/q/l/?s=${source.symbol}&f=sd2t2ohlcv&h&e=csv`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const text = await fetch(proxyUrl, { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    });
    const rows = text.trim().split(/\r?\n/);
    const values = rows[1]?.split(",") || [];
    const open = Number(values[3]);
    const close = Number(values[6]);
    return {
      key: source.key,
      label: source.label,
      price: close,
      change: open ? ((close - open) / open) * 100 : 0,
    };
  }));

  return settled.reduce((snapshot, item) => {
    if (item.status === "fulfilled" && Number.isFinite(item.value.price)) {
      snapshot[item.value.key] = item.value;
    }
    return snapshot;
  }, {});
}

function analyzeMarket({ candles, ticker, indicators }) {
  const closes = candles.map((candle) => candle.close);
  const latest = closes[closes.length - 1] || ticker.price;
  const prev = closes[closes.length - 7] || latest;
  const momentum6h = latest && prev ? ((latest - prev) / prev) * 100 : 0;
  const trendSpread = indicators.ema21 && indicators.ema55
    ? ((indicators.ema21 - indicators.ema55) / latest) * 100
    : 0;

  let score = 50;
  score += clamp(trendSpread * 18, -18, 18);
  score += clamp(momentum6h * 3, -12, 12);
  score += indicators.rsi < 35 ? (35 - indicators.rsi) * 0.65 : 0;
  score -= indicators.rsi > 65 ? (indicators.rsi - 65) * 0.65 : 0;
  score += latest > indicators.bbMid ? 4 : -4;
  score -= latest > indicators.bbUpper ? 9 : 0;
  score += latest < indicators.bbLower ? 9 : 0;
  score += ticker.change24h > 0 ? clamp(ticker.change24h, 0, 6) * 0.8 : clamp(ticker.change24h, -6, 0) * 0.8;

  const longProb = Math.round(clamp(score, 12, 88));
  const shortProb = 100 - longProb;
  const bias = longProb >= 58 ? "LONG" : shortProb >= 58 ? "SHORT" : "WAIT";
  const confidence = Math.round(clamp(Math.abs(longProb - 50) * 1.55 + 46, 42, 91));

  const factors = [
    `6H momentum: ${momentum6h >= 0 ? "+" : ""}${number(momentum6h, 2)}%`,
    `EMA spread: ${trendSpread >= 0 ? "+" : ""}${number(trendSpread, 2)}%`,
    `RSI regime: ${number(indicators.rsi, 1)} ${indicators.rsi < 35 ? "oversold" : indicators.rsi > 65 ? "overbought" : "balanced"}`,
    `ATR: ${compactUsd(indicators.atr, 0)} per 1H candle`,
  ];

  return {
    bias,
    confidence,
    longProb,
    shortProb,
    factors,
    summary:
      bias === "WAIT"
        ? "No clean edge yet. Let price resolve around the mid-band before committing size."
        : `${bias} bias is active, but only valid with a defined stop and no daily loss-limit breach.`,
  };
}

function StyleSheet() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
      * { box-sizing: border-box; }
      html, body, #root { min-height: 100%; margin: 0; }
      body { background: #070808; color: ${INK}; font-family: ${SANS}; }
      button, input { font: inherit; }
      button { border-radius: 8px; }
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      .btc-app {
        min-height: 100vh;
        background:
          radial-gradient(circle at 15% 0%, rgba(25, 211, 125, 0.12), transparent 26rem),
          radial-gradient(circle at 88% 12%, rgba(255, 77, 95, 0.12), transparent 30rem),
          linear-gradient(135deg, #070808 0%, #101112 48%, #070808 100%);
        color: ${INK};
        padding: 18px;
      }
      .shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 430px;
        gap: 14px;
        max-width: 1840px;
        margin: 0 auto;
      }
      .topbar {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        min-height: 72px;
        border: 1px solid ${LINE};
        background: rgba(11, 12, 13, 0.74);
        backdrop-filter: blur(18px);
        border-radius: 8px;
        padding: 16px 18px;
      }
      .brand { display: flex; align-items: center; gap: 14px; min-width: 260px; }
      .brand-mark {
        width: 44px; height: 44px; display: grid; place-items: center; border-radius: 8px;
        border: 1px solid rgba(246, 184, 75, 0.38);
        background: linear-gradient(145deg, rgba(246, 184, 75, 0.18), rgba(25, 211, 125, 0.08));
        color: ${AMBER}; font-family: ${MONO}; font-weight: 800;
      }
      .eyebrow { font-family: ${MONO}; color: ${MUTED}; font-size: 11px; letter-spacing: 0; text-transform: uppercase; }
      h1 { margin: 2px 0 0; font-size: clamp(27px, 3.1vw, 48px); line-height: 0.95; letter-spacing: 0; }
      .status-row { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
      .timeframe-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .pill {
        border: 1px solid ${LINE};
        border-radius: 8px;
        padding: 8px 10px;
        color: ${MUTED};
        background: rgba(255,255,255,0.035);
        font-family: ${MONO};
        font-size: 11px;
      }
      .pill.good { color: ${GREEN}; border-color: rgba(25,211,125,0.28); }
      .pill.bad { color: ${RED}; border-color: rgba(255,77,95,0.32); }
      .panel {
        border: 1px solid ${LINE};
        background: ${PANEL};
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 26px 70px rgba(0,0,0,0.32);
      }
      .main-stack { display: grid; gap: 14px; min-width: 0; }
      .side-stack { display: grid; gap: 14px; align-content: start; position: sticky; top: 12px; max-height: calc(100vh - 24px); overflow: auto; padding-right: 2px; }
      .market-strip {
        display: grid;
        grid-template-columns: minmax(220px, 1.2fr) repeat(4, minmax(120px, 0.7fr));
        gap: 1px;
        background: ${LINE};
      }
      .tile {
        background: rgba(12, 13, 14, 0.96);
        padding: 16px;
        min-height: 86px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .label {
        color: ${MUTED};
        font-family: ${MONO};
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0;
        margin-bottom: 7px;
      }
      .value { font-size: clamp(20px, 2.5vw, 38px); font-weight: 850; line-height: 1; letter-spacing: 0; }
      .tick-flash {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .tick-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--tick-color);
        box-shadow: 0 0 18px var(--tick-color);
      }
      .mono { font-family: ${MONO}; }
      .positive { color: ${GREEN}; }
      .negative { color: ${RED}; }
      .amber { color: ${AMBER}; }
      .chart-wrap { height: 438px; position: relative; background: #090a0a; }
      canvas.chart { width: 100%; height: 100%; display: block; }
      .chart-head {
        position: absolute; z-index: 2; top: 14px; left: 16px; right: 16px;
        display: flex; justify-content: space-between; gap: 12px; pointer-events: none;
      }
      .legend { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      .legend span {
        font-family: ${MONO}; font-size: 11px; color: ${MUTED};
        background: rgba(0,0,0,0.36); border: 1px solid ${LINE}; padding: 5px 7px; border-radius: 8px;
      }
      .section { padding: 16px; }
      .section-title { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 13px; }
      h2 { margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0; }
      .flow-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .flow-step {
        border: 1px solid ${LINE};
        border-radius: 8px;
        background: rgba(255,255,255,0.03);
        padding: 10px;
        min-height: 74px;
      }
      .flow-step strong { display: block; font-size: 12px; margin-bottom: 5px; }
      .flow-step span { display: block; color: ${MUTED}; font-family: ${MONO}; font-size: 10px; line-height: 1.35; }
      .prob-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .prob-card {
        border: 1px solid ${LINE};
        background: rgba(255,255,255,0.035);
        border-radius: 8px;
        padding: 14px;
        min-height: 116px;
        position: relative;
        overflow: hidden;
      }
      .prob-fill { position: absolute; inset: auto 0 0 0; height: var(--pct); opacity: 0.15; transition: height 380ms ease; }
      .prob-card strong { position: relative; display: block; font-size: clamp(32px, 4vw, 54px); line-height: 1; }
      .prob-card span { position: relative; font-family: ${MONO}; color: ${MUTED}; font-size: 11px; }
      .insight-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 12px; }
      .brief {
        border-left: 3px solid ${AMBER};
        padding: 12px 13px;
        background: rgba(246,184,75,0.055);
        color: #d8dbde;
        line-height: 1.55;
      }
      .factor-list { display: grid; gap: 8px; }
      .factor {
        display: flex; justify-content: space-between; gap: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.065);
        padding-bottom: 8px;
        color: ${MUTED};
        font-family: ${MONO};
        font-size: 12px;
      }
      .news-list { display: grid; gap: 9px; max-height: 395px; overflow: auto; padding-right: 2px; }
      .news-item {
        display: grid;
        gap: 7px;
        border: 1px solid ${LINE};
        background: rgba(255,255,255,0.035);
        border-radius: 8px;
        padding: 11px;
      }
      .news-title {
        color: ${INK};
        text-decoration: none;
        line-height: 1.35;
        font-weight: 750;
        font-size: 13px;
      }
      .news-title:hover { color: ${AMBER}; }
      .news-meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 8px;
        color: ${MUTED};
        font-family: ${MONO};
        font-size: 10px;
      }
      .impact {
        border-radius: 8px;
        padding: 4px 7px;
        font-family: ${MONO};
        font-size: 10px;
        font-weight: 800;
      }
      .impact.high { color: ${RED}; background: rgba(255,77,95,0.12); border: 1px solid rgba(255,77,95,0.32); }
      .impact.med { color: ${AMBER}; background: rgba(246,184,75,0.12); border: 1px solid rgba(246,184,75,0.32); }
      .impact.low { color: ${GREEN}; background: rgba(25,211,125,0.1); border: 1px solid rgba(25,211,125,0.25); }
      .mini-chart {
        display: flex;
        align-items: end;
        gap: 3px;
        height: 86px;
        padding: 8px;
        border: 1px solid ${LINE};
        border-radius: 8px;
        background: rgba(255,255,255,0.025);
      }
      .mini-bar {
        flex: 1;
        min-width: 3px;
        height: var(--h);
        background: var(--bar-color);
        border-radius: 4px 4px 0 0;
      }
      .setup-card {
        display: grid;
        gap: 10px;
        border: 1px solid rgba(246,184,75,0.24);
        background: rgba(246,184,75,0.055);
        border-radius: 8px;
        padding: 12px;
      }
      .trade-actions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
      .primary-panel { border-color: rgba(246,184,75,0.38); box-shadow: 0 24px 90px rgba(246,184,75,0.08); }
      .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .field { display: grid; gap: 6px; }
      .field input {
        width: 100%;
        min-height: 42px;
        border-radius: 8px;
        border: 1px solid ${LINE};
        background: rgba(255,255,255,0.04);
        color: ${INK};
        padding: 10px 11px;
        outline: none;
        font-family: ${MONO};
      }
      .field input:focus { border-color: rgba(246,184,75,0.55); }
      .button-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .btn {
        border: 1px solid ${LINE};
        background: rgba(255,255,255,0.04);
        color: ${INK};
        padding: 10px 12px;
        cursor: pointer;
        min-height: 40px;
        font-weight: 750;
      }
      .btn:hover { border-color: rgba(255,255,255,0.22); }
      .btn.green { color: ${GREEN}; border-color: rgba(25,211,125,0.38); }
      .btn.red { color: ${RED}; border-color: rgba(255,77,95,0.38); }
      .btn.active { background: ${AMBER}; color: #111; border-color: ${AMBER}; }
      .calc-list { display: grid; gap: 1px; background: ${LINE}; border-radius: 8px; overflow: hidden; }
      .calc-row { display: flex; justify-content: space-between; gap: 12px; padding: 11px 12px; background: rgba(10,11,12,0.96); }
      .calc-row span:first-child { color: ${MUTED}; font-family: ${MONO}; font-size: 11px; text-transform: uppercase; }
      .calc-row strong { font-family: ${MONO}; font-size: 13px; text-align: right; }
      .risk-bars { display: grid; gap: 12px; }
      .risk-line { display: grid; gap: 6px; }
      .bar { height: 9px; background: rgba(255,255,255,0.07); border-radius: 8px; overflow: hidden; }
      .bar > div { height: 100%; width: var(--pct); background: var(--color); transition: width 340ms ease; }
      .journal { display: grid; gap: 8px; max-height: 286px; overflow: auto; padding-right: 2px; }
      .trade {
        display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
        padding: 10px; border: 1px solid ${LINE}; background: rgba(255,255,255,0.03); border-radius: 8px;
      }
      .badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 58px; border-radius: 8px; padding: 6px 8px; font-family: ${MONO}; font-size: 11px; font-weight: 700;
      }
      .empty {
        color: #60676f; border: 1px dashed rgba(255,255,255,0.13); border-radius: 8px;
        padding: 18px; text-align: center; font-family: ${MONO}; font-size: 12px;
      }
      .disclaimer { color: #6f747a; font-size: 11px; line-height: 1.5; }
      @media (max-width: 1180px) {
        .shell { grid-template-columns: 1fr; }
        .side-stack { position: static; max-height: none; overflow: visible; padding-right: 0; }
        .market-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .flow-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .chart-wrap { height: 380px; }
      }
      @media (max-width: 700px) {
        .btc-app { padding: 10px; }
        .topbar { align-items: flex-start; flex-direction: column; }
        .status-row { justify-content: flex-start; }
        .market-strip, .prob-grid, .insight-grid, .input-grid, .flow-steps { grid-template-columns: 1fr; }
        .chart-wrap { height: 320px; }
        .chart-head { position: static; padding: 12px; background: #090a0a; }
      }
    `}</style>
  );
}

function Panel({ children, className = "" }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function MetricTile({ label, value, tone, sub }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className={`value ${tone || ""}`}>{value}</div>
      {sub ? <div className="eyebrow" style={{ marginTop: 8 }}>{sub}</div> : null}
    </div>
  );
}

function CalcRow({ label, value, tone }) {
  return (
    <div className="calc-row">
      <span>{label}</span>
      <strong className={tone || ""}>{value}</strong>
    </div>
  );
}

function CandleChart({ candles, indicators, marketView }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || candles.length < 5) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const pad = { top: 34, right: 72, bottom: 44, left: 22 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const recent = candles.slice(-96);
    const closes = recent.map((candle) => candle.close);
    const ma21 = lineSeries(closes, 21);
    const ma55 = lineSeries(closes, 55);
    const prices = recent.flatMap((candle) => [candle.high, candle.low, indicators.bbUpper, indicators.bbLower].filter(Boolean));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pricePad = (max - min) * 0.08 || max * 0.02;
    const minP = min - pricePad;
    const maxP = max + pricePad;
    const x = (index) => pad.left + (plotW / Math.max(recent.length - 1, 1)) * index;
    const y = (price) => pad.top + ((maxP - price) / (maxP - minP)) * plotH;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#090a0a";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i <= 5; i += 1) {
      const yy = pad.top + (plotH / 5) * i;
      const price = maxP - ((maxP - minP) / 5) * i;
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(width - pad.right, yy);
      ctx.stroke();
      ctx.fillStyle = "rgba(246,247,248,0.45)";
      ctx.font = `11px ${MONO}`;
      ctx.fillText(number(price, 0), width - pad.right + 10, yy + 4);
    }

    const drawLine = (series, color, widthValue = 1.6) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = widthValue;
      ctx.beginPath();
      let started = false;
      series.forEach((value, index) => {
        if (!value) return;
        if (!started) {
          ctx.moveTo(x(index), y(value));
          started = true;
        } else {
          ctx.lineTo(x(index), y(value));
        }
      });
      ctx.stroke();
    };

    if (indicators.bbUpper && indicators.bbLower) {
      ctx.fillStyle = "rgba(246,184,75,0.055)";
      ctx.beginPath();
      recent.forEach((_, index) => {
        const xx = x(index);
        const yy = y(indicators.bbUpper);
        if (index === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      });
      [...recent].reverse().forEach((_, reverseIndex) => {
        const index = recent.length - 1 - reverseIndex;
        ctx.lineTo(x(index), y(indicators.bbLower));
      });
      ctx.closePath();
      ctx.fill();
      drawLine(recent.map(() => indicators.bbUpper), "rgba(246,184,75,0.48)", 1);
      drawLine(recent.map(() => indicators.bbLower), "rgba(246,184,75,0.48)", 1);
    }

    drawLine(ma21, "rgba(25,211,125,0.88)", 1.8);
    drawLine(ma55, "rgba(255,77,95,0.86)", 1.8);

    const spacing = plotW / Math.max(recent.length, 1);
    const candleW = clamp(spacing * 0.58, 2, 9);
    recent.forEach((candle, index) => {
      const xx = x(index);
      const up = candle.close >= candle.open;
      const color = up ? GREEN : RED;
      const top = y(Math.max(candle.open, candle.close));
      const bottom = y(Math.min(candle.open, candle.close));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(xx, y(candle.high));
      ctx.lineTo(xx, y(candle.low));
      ctx.stroke();
      ctx.fillStyle = up ? "rgba(25,211,125,0.82)" : "rgba(255,77,95,0.82)";
      ctx.fillRect(xx - candleW / 2, top, candleW, Math.max(bottom - top, 1.4));
    });

    const last = recent[recent.length - 1];
    if (last) {
      const lastY = y(last.close);
      ctx.strokeStyle = marketView.bias === "LONG" ? GREEN : marketView.bias === "SHORT" ? RED : AMBER;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(pad.left, lastY);
      ctx.lineTo(width - pad.right, lastY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(width - pad.right + 7, lastY - 12, 62, 24);
      ctx.fillStyle = "#101112";
      ctx.font = `700 11px ${MONO}`;
      ctx.fillText(number(last.close, 0), width - pad.right + 13, lastY + 4);
    }
  }, [candles, indicators, marketView]);

  return <canvas ref={ref} className="chart" aria-label="BTC candlestick chart" />;
}

function RiskBar({ label, used, limit }) {
  const ratio = limit > 0 ? used / limit : 0;
  const color = ratio >= 1 ? RED : ratio >= 0.75 ? AMBER : GREEN;
  return (
    <div className="risk-line">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span className="label" style={{ margin: 0 }}>{label}</span>
        <span className="mono" style={{ color }}>{compactUsd(used, 0)} / {compactUsd(limit, 0)}</span>
      </div>
      <div className="bar" style={{ "--pct": `${clamp(ratio * 100, 0, 100)}%`, "--color": color }}>
        <div />
      </div>
    </div>
  );
}

export default function BTCTradingAssistant() {
  const [timeframe, setTimeframe] = useState("1m");
  const [candles, setCandles] = useState([]);
  const [ticker, setTicker] = useState({ price: 0, change24h: 0, volume: 0 });
  const [indicators, setIndicators] = useState({
    rsi: 50,
    sma20: 0,
    ema21: 0,
    ema55: 0,
    bbUpper: 0,
    bbMid: 0,
    bbLower: 0,
    bbWidth: 0,
    atr: 0,
  });
  const [accountBalance, setAccountBalance] = useState(() => readStored(STORAGE_KEYS.balance, 10000));
  const [riskTier, setRiskTier] = useState(1);
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [dailyLoss, setDailyLoss] = useState(() => readStored(STORAGE_KEYS.dailyLoss, 0));
  const [weeklyLoss, setWeeklyLoss] = useState(() => readStored(STORAGE_KEYS.weeklyLoss, 0));
  const [trades, setTrades] = useState(() => readStored(STORAGE_KEYS.trades, []));
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [feedStatus, setFeedStatus] = useState("connecting");
  const [wsStatus, setWsStatus] = useState("connecting");
  const [tickDirection, setTickDirection] = useState("flat");
  const [news, setNews] = useState([]);
  const [newsStatus, setNewsStatus] = useState("loading");
  const [macro, setMacro] = useState({});
  const [fearHistory, setFearHistory] = useState([]);
  const [ollamaModel, setOllamaModel] = useState(getStoredOllamaModel);
  const [ollamaStatus, setOllamaStatus] = useState("idle");
  const [aiNote, setAiNote] = useState("Local AI is optional. The deterministic signal engine is active now.");
  const aiLockRef = useRef(false);
  const refreshLockRef = useRef(false);

  const refreshMarket = useCallback(async () => {
    if (refreshLockRef.current) return;
    refreshLockRef.current = true;
    setIsLoading(true);
    try {
      const [nextCandles, marketTicker] = await Promise.all([
        fetchBinanceCandles(timeframe),
        fetchTickerFromSources(),
      ]);
      setCandles(nextCandles);
      setTicker({
        price: marketTicker.price,
        change24h: marketTicker.change24h,
        volume: marketTicker.volume,
      });
      setIndicators(updateIndicatorSet(nextCandles));
      setFeedStatus(marketTicker.source);
      setLastUpdate(new Date());
    } catch {
      let marketTicker = null;
      try {
        marketTicker = await fetchTickerFromSources();
      } catch {
        marketTicker = null;
      }
      const fallback = buildFallbackCandles();
      if (marketTicker?.price) {
        const drift = marketTicker.price - fallback[fallback.length - 1].close;
        fallback.forEach((candle) => {
          candle.open += drift;
          candle.high += drift;
          candle.low += drift;
          candle.close += drift;
        });
      }
      const closes = fallback.map((candle) => candle.close);
      setCandles(fallback);
      setTicker({
        price: marketTicker?.price || closes[closes.length - 1],
        change24h: marketTicker?.change24h ?? ((closes[closes.length - 1] - closes[closes.length - 25]) / closes[closes.length - 25]) * 100,
        volume: marketTicker?.volume || 2_800_000_000,
      });
      setIndicators(updateIndicatorSet(fallback));
      setFeedStatus(marketTicker ? `${marketTicker.source} price / demo chart` : "demo");
      setLastUpdate(new Date());
    } finally {
      refreshLockRef.current = false;
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    refreshMarket();
    const refreshId = window.setInterval(refreshMarket, REFRESH_MS);
    const clockId = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => {
      window.clearInterval(refreshId);
      window.clearInterval(clockId);
    };
  }, [refreshMarket]);

  useEffect(() => {
    let socket;
    let closed = false;
    try {
      setWsStatus("connecting");
      socket = new WebSocket(BINANCE_WS_URL(timeframe));
      socket.onopen = () => {
        if (!closed) setWsStatus("live");
      };
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        const stream = payload.stream || "";
        const data = payload.data || {};

        if (stream.includes("@ticker")) {
          const livePrice = Number(data.c);
          const liveChange = Number(data.P);
          const liveVolume = Number(data.q);
          if (Number.isFinite(livePrice) && livePrice > 0) {
            setTicker((previous) => {
              setTickDirection(livePrice > previous.price ? "up" : livePrice < previous.price ? "down" : "flat");
              return {
                price: livePrice,
                change24h: Number.isFinite(liveChange) ? liveChange : previous.change24h,
                volume: Number.isFinite(liveVolume) ? liveVolume : previous.volume,
              };
            });
            setFeedStatus("Binance WS");
            setLastUpdate(new Date());
          }
        }

        if (stream.includes("@kline") && data.k) {
          const kline = data.k;
          const liveCandle = {
            time: Number(kline.t),
            open: Number(kline.o),
            high: Number(kline.h),
            low: Number(kline.l),
            close: Number(kline.c),
            volume: Number(kline.v),
          };
          if (Number.isFinite(liveCandle.close)) {
            setCandles((current) => {
              const next = current.length ? [...current] : [liveCandle];
              const lastIndex = next.length - 1;
              if (next[lastIndex]?.time === liveCandle.time) {
                next[lastIndex] = liveCandle;
              } else {
                next.push(liveCandle);
              }
              const trimmed = next.slice(-240);
              setIndicators(updateIndicatorSet(trimmed));
              return trimmed;
            });
          }
        }
      };
      socket.onerror = () => {
        if (!closed) setWsStatus("fallback");
      };
      socket.onclose = () => {
        if (!closed) setWsStatus("fallback");
      };
    } catch {
      setWsStatus("fallback");
    }

    return () => {
      closed = true;
      if (socket) socket.close();
    };
  }, [timeframe]);

  useEffect(() => {
    let cancelled = false;
    const loadNews = async () => {
      setNewsStatus("loading");
      try {
        const stories = await fetchMarketNews();
        if (!cancelled) {
          setNews(stories);
          setNewsStatus("live");
        }
      } catch {
        if (!cancelled) {
          setNews([
            {
              id: "fallback-news",
              source: "Local brief",
              title: "News feed unavailable. Watch ETF flows, Fed rate expectations, liquidation clusters, and regulatory headlines.",
              link: "#",
              publishedAt: new Date().toUTCString(),
              impact: "MED",
              score: 5,
              reason: "feed unavailable",
            },
          ]);
          setNewsStatus("fallback");
        }
      }
    };
    loadNews();
    const id = window.setInterval(loadNews, 300_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMacro = async () => {
      try {
        const snapshot = await fetchMacroSnapshot();
        if (!cancelled) setMacro(snapshot);
      } catch {
        if (!cancelled) setMacro({});
      }
    };
    loadMacro();
    const id = window.setInterval(loadMacro, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    writeStored(STORAGE_KEYS.trades, trades);
  }, [trades]);

  useEffect(() => {
    writeStored(STORAGE_KEYS.dailyLoss, dailyLoss);
  }, [dailyLoss]);

  useEffect(() => {
    writeStored(STORAGE_KEYS.weeklyLoss, weeklyLoss);
  }, [weeklyLoss]);

  useEffect(() => {
    writeStored(STORAGE_KEYS.balance, accountBalance);
  }, [accountBalance]);

  useEffect(() => {
    writeStored(STORAGE_KEYS.model, ollamaModel);
  }, [ollamaModel]);

  const marketView = useMemo(
    () => analyzeMarket({ candles, ticker, indicators }),
    [candles, ticker, indicators],
  );

  const riskAmount = accountBalance * (riskTier / 100);
  const dailyLimit = accountBalance * 0.06;
  const weeklyLimit = accountBalance * 0.1;
  const entry = Number.parseFloat(entryPrice) || 0;
  const stop = Number.parseFloat(stopLoss) || 0;
  const riskPerBtc = Math.abs(entry - stop);
  const direction = entry && stop ? (entry >= stop ? "LONG" : "SHORT") : marketView.bias === "SHORT" ? "SHORT" : "LONG";
  const sizeBtc = riskPerBtc > 0 ? riskAmount / riskPerBtc : 0;
  const target = entry && stop
    ? direction === "LONG"
      ? entry + riskPerBtc * 3
      : entry - riskPerBtc * 3
    : 0;
  const grossProfit = sizeBtc * riskPerBtc * 3;
  const expectedMonthly = riskAmount * 12;
  const tradingLocked = dailyLoss >= dailyLimit || weeklyLoss >= weeklyLimit;
  const secondsSinceUpdate = lastUpdate ? Math.floor((clockNow - lastUpdate.getTime()) / 1000) : null;
  const nextRefreshIn = secondsSinceUpdate === null
    ? Math.ceil(REFRESH_MS / 1000)
    : Math.max(0, Math.ceil(REFRESH_MS / 1000) - secondsSinceUpdate);
  const suggestedSetup = useMemo(
    () => buildSuggestedSetup({ ticker, indicators, marketView, timeframe, riskAmount }),
    [ticker, indicators, marketView, timeframe, riskAmount],
  );
  const activeTrades = trades.filter((trade) => trade.status === "ACTIVE");
  const closedTrades = trades.filter((trade) => trade.status !== "ACTIVE");
  const socialTrendProxy = useMemo(() => {
    const keywords = news.flatMap((item) => item.reason.split(", ").filter(Boolean));
    const unique = Array.from(new Set(keywords)).slice(0, 6);
    return unique.length ? unique : ["ETF", "Fed", "liquidation", "gold", "silver"];
  }, [news]);

  useEffect(() => {
    if (!ticker.price) return;
    const point = buildFearPoint({ ticker, indicators, marketView, news, macro });
    setFearHistory((current) => [...current.slice(-59), point]);
  }, [clockNow, ticker, indicators, marketView, news, macro]);

  const fetchAI = useCallback(async () => {
    if (aiLockRef.current) return;
    aiLockRef.current = true;
    setOllamaStatus("idle");
    try {
      const prompt = [
        "You are lfm2.5-thinking running locally in Ollama as a disciplined BTC execution analyst.",
        "Think through market structure, news, events, macro, and stored trade history, then return a compact answer.",
        "Format exactly: BIAS, SETUP, ENTRY ZONE, STOP, TP1, TP2, INVALIDATION, NEWS/MACRO RISK, APPROVE OR WAIT.",
        `Price: ${ticker.price}`,
        `Timeframe: ${timeframe}`,
        `24h change: ${ticker.change24h}%`,
        `RSI: ${indicators.rsi}`,
        `EMA21: ${indicators.ema21}`,
        `EMA55: ${indicators.ema55}`,
        `ATR: ${indicators.atr}`,
        `Model bias: ${marketView.bias} ${marketView.confidence}% confidence`,
        `Suggested setup: ${suggestedSetup.direction} entry ${suggestedSetup.entryLow}-${suggestedSetup.entryHigh}, SL ${suggestedSetup.stop}, TP1 ${suggestedSetup.tp1}, TP2 ${suggestedSetup.tp2}`,
        `Active trades: ${activeTrades.map((trade) => `${trade.direction} entry ${trade.entry} SL ${trade.stop} TP ${trade.tp2}`).join(" | ") || "none"}`,
        `Trade history: ${closedTrades.slice(0, 8).map((trade) => `${trade.direction} ${trade.status} PnL ${trade.pnl}`).join(" | ") || "none"}`,
        `Latest news impact: ${news.slice(0, 5).map((item) => `${item.impact} ${item.source}: ${item.title}`).join(" | ") || "none"}`,
        `Upcoming events: ${UPCOMING_EVENTS.map((event) => `${event.impact} ${event.title}: ${event.direction}`).join(" | ")}`,
        `Macro: gold ${macro.gold?.change?.toFixed?.(2) ?? "n/a"}%, silver ${macro.silver?.change?.toFixed?.(2) ?? "n/a"}%, SPX ${macro.spx?.change?.toFixed?.(2) ?? "n/a"}%, Nasdaq ${macro.nasdaq?.change?.toFixed?.(2) ?? "n/a"}%`,
        `Social trend proxy from news/Twitter-like keywords: ${socialTrendProxy.join(", ")}`,
        "Do not promise profit. Do not overtrade. If evidence is mixed, say WAIT even if the rules engine has a directional bias.",
      ].join("\n");
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: ollamaModel || DEFAULT_OLLAMA_MODEL, prompt, stream: false }),
      });
      if (!response.ok) throw new Error("ollama offline");
      const data = await response.json();
      setAiNote(data.response?.trim() || "Ollama responded without a usable note.");
      setOllamaStatus("ok");
    } catch {
      setAiNote("Ollama is offline or blocked by the browser. The built-in rules engine remains active.");
      setOllamaStatus("error");
    } finally {
      aiLockRef.current = false;
    }
  }, [activeTrades, closedTrades, indicators, macro, marketView, news, ollamaModel, socialTrendProxy, suggestedSetup, ticker, timeframe]);

  const addTrade = useCallback((outcome) => {
    if (!entry || !stop || !riskPerBtc) return;
    const pnl = outcome === "win" ? grossProfit : -riskAmount;
    const trade = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
      direction,
      source: "Manual calculator",
      status: outcome === "win" ? "MANUAL WIN" : "MANUAL LOSS",
      approved: true,
      outcome,
      entry,
      stop,
      target,
      tp2: target,
      sizeBtc,
      pnl,
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setTrades((current) => [trade, ...current].slice(0, 30));
    if (outcome === "loss") {
      setDailyLoss((value) => value + riskAmount);
      setWeeklyLoss((value) => value + riskAmount);
    }
  }, [direction, entry, grossProfit, riskAmount, riskPerBtc, sizeBtc, stop, target]);

  const approveSuggestedTrade = useCallback(() => {
    if (!suggestedSetup.entryMid || tradingLocked) return;
    const riskDistance = Math.abs(suggestedSetup.entryMid - suggestedSetup.stop);
    const sizeBtc = riskDistance ? riskAmount / riskDistance : 0;
    const trade = {
      ...suggestedSetup,
      id: globalThis.crypto?.randomUUID?.() || `trade-${Date.now()}`,
      source: "AI suggested setup",
      status: "ACTIVE",
      approved: true,
      entry: suggestedSetup.entryMid,
      stop: suggestedSetup.stop,
      tp1: suggestedSetup.tp1,
      tp2: suggestedSetup.tp2,
      sizeBtc,
      openedAt: new Date().toISOString(),
      pnl: 0,
    };
    setTrades((current) => [trade, ...current]);
  }, [riskAmount, suggestedSetup, tradingLocked]);

  const rejectSuggestedTrade = useCallback(() => {
    const trade = {
      ...suggestedSetup,
      id: globalThis.crypto?.randomUUID?.() || `skip-${Date.now()}`,
      source: "AI suggested setup",
      status: "SKIPPED",
      approved: false,
      entry: suggestedSetup.entryMid,
      openedAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
      pnl: 0,
    };
    setTrades((current) => [trade, ...current]);
  }, [suggestedSetup]);

  const removeTrade = useCallback((tradeId) => {
    setTrades((current) => current.filter((trade) => trade.id !== tradeId));
  }, []);

  const closeTradeManual = useCallback((tradeId) => {
    setTrades((current) => current.map((trade) => {
      if (trade.id !== tradeId || trade.status !== "ACTIVE") return trade;
      const pnl = getTradePnl(trade, ticker.price);
      return {
        ...trade,
        status: pnl >= 0 ? "CLOSED PROFIT" : "CLOSED LOSS",
        exitPrice: ticker.price,
        pnl,
        closedAt: new Date().toISOString(),
      };
    }));
  }, [ticker.price]);

  useEffect(() => {
    if (!ticker.price) return;
    setTrades((current) => {
      let dailyLossAdd = 0;
      let weeklyLossAdd = 0;
      let changed = false;
      const next = current.map((trade) => {
        if (trade.status !== "ACTIVE") return trade;
        const hitStop = trade.direction === "LONG" ? ticker.price <= trade.stop : ticker.price >= trade.stop;
        const hitTarget = trade.direction === "LONG" ? ticker.price >= trade.tp2 : ticker.price <= trade.tp2;
        if (!hitStop && !hitTarget) return trade;
        const exitPrice = hitTarget ? trade.tp2 : trade.stop;
        const pnl = getTradePnl(trade, exitPrice);
        if (pnl < 0) {
          dailyLossAdd += Math.abs(pnl);
          weeklyLossAdd += Math.abs(pnl);
        }
        changed = true;
        return {
          ...trade,
          status: hitTarget ? "TP HIT" : "SL HIT",
          exitPrice,
          pnl,
          closedAt: new Date().toISOString(),
        };
      });
      if (dailyLossAdd) setDailyLoss((value) => value + dailyLossAdd);
      if (weeklyLossAdd) setWeeklyLoss((value) => value + weeklyLossAdd);
      return changed ? next : current;
    });
  }, [ticker.price]);

  const totalPnl = trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
  const wins = trades.filter((trade) => (Number(trade.pnl) || 0) > 0 || trade.status === "TP HIT").length;
  const losses = trades.filter((trade) => (Number(trade.pnl) || 0) < 0 || trade.status === "SL HIT").length;
  const sentimentTone = marketView.bias === "LONG" ? "positive" : marketView.bias === "SHORT" ? "negative" : "amber";
  const rsiTone = indicators.rsi < 35 ? "positive" : indicators.rsi > 65 ? "negative" : "amber";

  return (
    <div className="btc-app">
      <StyleSheet />
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">BTC</div>
            <div>
              <div className="eyebrow">Execution command center</div>
              <h1>BTC Trading Assistant</h1>
            </div>
          </div>
          <div className="status-row">
            <span className={`pill ${feedStatus === "demo" ? "bad" : feedStatus === "connecting" ? "" : "good"}`}>
              Feed: {feedStatus.toUpperCase()}
            </span>
            <span className={`pill ${wsStatus === "live" ? "good" : wsStatus === "fallback" ? "bad" : ""}`}>
              Tick: {wsStatus.toUpperCase()}
            </span>
            <span className="pill">
              Updated: {lastUpdate ? lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
            </span>
            <span className="pill">
              Next refresh: {isLoading ? "now" : `${nextRefreshIn}s`}
            </span>
            <span className={`pill ${tradingLocked ? "bad" : "good"}`}>
              Guardrail: {tradingLocked ? "LOCKED" : "CLEAR"}
            </span>
            <button className="btn" onClick={refreshMarket} disabled={isLoading}>
              {isLoading ? "Refreshing" : "Refresh"}
            </button>
          </div>
          <div className="timeframe-row">
            {TIMEFRAMES.map((item) => (
              <button
                key={item.value}
                className={`btn ${timeframe === item.value ? "active" : ""}`}
                onClick={() => setTimeframe(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <main className="main-stack">
          <Panel>
            <div className="market-strip">
              <MetricTile
                label="BTCUSD"
                value={(
                  <span className="tick-flash" style={{ "--tick-color": tickDirection === "up" ? GREEN : tickDirection === "down" ? RED : AMBER }}>
                    <span className="tick-dot" />
                    {compactUsd(ticker.price, 0)}
                  </span>
                )}
                sub={`1s tick: ${wsStatus} / source: ${feedStatus}`}
              />
              <MetricTile
                label="24H Change"
                value={`${ticker.change24h >= 0 ? "+" : ""}${number(ticker.change24h, 2)}%`}
                tone={ticker.change24h >= 0 ? "positive" : "negative"}
              />
              <MetricTile label="RSI 14" value={number(indicators.rsi, 1)} tone={rsiTone} />
              <MetricTile label="ATR 1H" value={compactUsd(indicators.atr, 0)} />
              <MetricTile label="24H Volume" value={compactUsd(ticker.volume, 1)} />
            </div>
          </Panel>

          <Panel>
            <div className="chart-wrap">
              <div className="chart-head">
                <div>
                  <div className="label">Live {timeframe} candle map</div>
                  <div className={`mono ${sentimentTone}`} style={{ fontWeight: 800 }}>
                    {marketView.bias} BIAS / {marketView.confidence}% CONFIDENCE
                  </div>
                </div>
                <div className="legend">
                  <span style={{ color: GREEN }}>EMA 21</span>
                  <span style={{ color: RED }}>EMA 55</span>
                  <span style={{ color: AMBER }}>Bollinger</span>
                </div>
              </div>
              <CandleChart candles={candles} indicators={indicators} marketView={marketView} />
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Trading Flow</h2>
                <span className="pill">Read left to right</span>
              </div>
              <div className="flow-steps">
                <div className="flow-step">
                  <strong>1. Live Market</strong>
                  <span>Watch 1s BTC ticks, timeframe candles, RSI, ATR, and bias.</span>
                </div>
                <div className="flow-step">
                  <strong>2. Setup</strong>
                  <span>Use the AI suggested zone, SL, TP1, and TP2 before entering.</span>
                </div>
                <div className="flow-step">
                  <strong>3. Confirm</strong>
                  <span>Approve only after you actually play the trade.</span>
                </div>
                <div className="flow-step">
                  <strong>4. Track</strong>
                  <span>The local database auto-detects TP or SL and stores history.</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="primary-panel">
            <div className="section">
              <div className="section-title">
                <h2>AI Suggested Trade</h2>
                <span className={`badge ${suggestedSetup.direction === "LONG" ? "positive" : "negative"}`} style={{
                  border: `1px solid ${suggestedSetup.direction === "LONG" ? "rgba(25,211,125,0.38)" : "rgba(255,77,95,0.38)"}`,
                  background: suggestedSetup.direction === "LONG" ? "rgba(25,211,125,0.1)" : "rgba(255,77,95,0.1)",
                }}>
                  {suggestedSetup.direction}
                </span>
              </div>
              <div className="setup-card">
                <div className="calc-list">
                  <CalcRow label="Entry zone" value={`${compactUsd(suggestedSetup.entryLow, 0)} - ${compactUsd(suggestedSetup.entryHigh, 0)}`} tone="amber" />
                  <CalcRow label="Confirm entry" value={compactUsd(suggestedSetup.entryMid, 2)} />
                  <CalcRow label="Stop loss" value={compactUsd(suggestedSetup.stop, 2)} tone="negative" />
                  <CalcRow label="TP 1 / TP 2" value={`${compactUsd(suggestedSetup.tp1, 0)} / ${compactUsd(suggestedSetup.tp2, 0)}`} tone="positive" />
                  <CalcRow label="Risk size" value={compactUsd(riskAmount, 2)} />
                </div>
                <div className="disclaimer">
                  Press AI analyse for lfm2.5-thinking review. Approve only after you actually enter; the app then watches live TP and SL.
                </div>
                <div className="button-row">
                  <button className="btn green" onClick={approveSuggestedTrade} disabled={tradingLocked}>Approve / I played it</button>
                  <button className="btn red" onClick={rejectSuggestedTrade}>Skip setup</button>
                  <button className="btn" onClick={fetchAI}>AI analyse</button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Probability Engine</h2>
                <span className="pill">Rules + lfm2.5-thinking</span>
              </div>
              <div className="prob-grid">
                <div className="prob-card" style={{ "--pct": `${marketView.longProb}%` }}>
                  <div className="prob-fill" style={{ background: GREEN }} />
                  <span>Long probability</span>
                  <strong className="positive">{marketView.longProb}%</strong>
                </div>
                <div className="prob-card" style={{ "--pct": `${marketView.shortProb}%` }}>
                  <div className="prob-fill" style={{ background: RED }} />
                  <span>Short probability</span>
                  <strong className="negative">{marketView.shortProb}%</strong>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Market Brief</h2>
                <button className="btn" onClick={fetchAI}>Ask Ollama</button>
              </div>
              <div className="insight-grid">
                <div className="brief">
                  <strong className={sentimentTone}>{marketView.bias} setup:</strong> {marketView.summary}
                  <div className="disclaimer" style={{ marginTop: 10 }}>{aiNote}</div>
                </div>
                <div className="factor-list">
                  {marketView.factors.map((factor) => {
                    const [label, value] = factor.split(": ");
                    return (
                      <div className="factor" key={factor}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    );
                  })}
                  <div className="factor">
                    <span>Ollama</span>
                    <strong className={ollamaStatus === "ok" ? "positive" : ollamaStatus === "error" ? "negative" : ""}>
                      {ollamaStatus.toUpperCase()}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Fear / Impact Graph</h2>
                <span className="pill">Updates every second</span>
              </div>
              <div className="mini-chart">
                {fearHistory.map((point, index) => (
                  <div
                    key={`${point.time}-${index}`}
                    className="mini-bar"
                    title={`${point.time}: ${point.score}`}
                    style={{
                      "--h": `${Math.max(6, point.score)}%`,
                      "--bar-color": point.score >= 70 ? RED : point.score >= 45 ? AMBER : GREEN,
                    }}
                  />
                ))}
              </div>
              <div className="factor-list" style={{ marginTop: 12 }}>
                <div className="factor">
                  <span>Current fear</span>
                  <strong className={(fearHistory[fearHistory.length - 1]?.score || 0) >= 70 ? "negative" : "amber"}>
                    {fearHistory[fearHistory.length - 1]?.score ?? "-"} / 100
                  </strong>
                </div>
                <div className="factor">
                  <span>Gold / Silver</span>
                  <strong>
                    {macro.gold ? `${number(macro.gold.change, 2)}%` : "n/a"} / {macro.silver ? `${number(macro.silver.change, 2)}%` : "n/a"}
                  </strong>
                </div>
                <div className="factor">
                  <span>Global risk proxy</span>
                  <strong>
                    SPX {macro.spx ? `${number(macro.spx.change, 2)}%` : "n/a"} / NQ {macro.nasdaq ? `${number(macro.nasdaq.change, 2)}%` : "n/a"}
                  </strong>
                </div>
              </div>
            </div>
          </Panel>
        </main>

        <aside className="side-stack">
          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Account Risk</h2>
                <div className="button-row">
                  {[0.5, 1, 2].map((risk) => (
                    <button
                      key={risk}
                      className={`btn ${riskTier === risk ? "active" : ""}`}
                      onClick={() => setRiskTier(risk)}
                    >
                      {risk}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label className="label">Account balance</label>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(event) => setAccountBalance(Math.max(0, Number(event.target.value) || 0))}
                />
              </div>
              <div className="calc-list">
                <CalcRow label="Risk amount" value={compactUsd(riskAmount, 2)} tone="amber" />
                <CalcRow label="Daily limit 6%" value={compactUsd(dailyLimit, 2)} />
                <CalcRow label="Weekly limit 10%" value={compactUsd(weeklyLimit, 2)} />
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Loss Guardrails</h2>
                <button className="btn" onClick={() => { setDailyLoss(0); setWeeklyLoss(0); }}>Reset</button>
              </div>
              <div className="risk-bars">
                <RiskBar label="Daily loss" used={dailyLoss} limit={dailyLimit} />
                <RiskBar label="Weekly loss" used={weeklyLoss} limit={weeklyLimit} />
              </div>
              {tradingLocked ? (
                <div className="brief" style={{ borderColor: RED, marginTop: 14 }}>
                  Trading lock active. Step away until the limit window resets.
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Trade Calculator</h2>
                <span className={`badge ${direction === "LONG" ? "positive" : "negative"}`} style={{
                  border: `1px solid ${direction === "LONG" ? "rgba(25,211,125,0.38)" : "rgba(255,77,95,0.38)"}`,
                  background: direction === "LONG" ? "rgba(25,211,125,0.1)" : "rgba(255,77,95,0.1)",
                }}>
                  {direction}
                </span>
              </div>
              <div className="input-grid" style={{ marginBottom: 12 }}>
                <div className="field">
                  <label className="label">Entry</label>
                  <input
                    type="number"
                    placeholder={number(ticker.price, 0)}
                    value={entryPrice}
                    onChange={(event) => setEntryPrice(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">Stop loss</label>
                  <input
                    type="number"
                    placeholder={number(ticker.price - indicators.atr * 1.5, 0)}
                    value={stopLoss}
                    onChange={(event) => setStopLoss(event.target.value)}
                  />
                </div>
              </div>
              <div className="calc-list" style={{ marginBottom: 12 }}>
                <CalcRow label="Position size" value={`${number(sizeBtc, 5)} BTC`} tone="amber" />
                <CalcRow label="Take profit 3R" value={target ? compactUsd(target, 2) : "-"} tone="positive" />
                <CalcRow label="Max loss" value={`-${compactUsd(riskAmount, 2)}`} tone="negative" />
                <CalcRow label="Max profit" value={`+${compactUsd(grossProfit, 2)}`} tone="positive" />
              </div>
              <div className="button-row">
                <button className="btn green" onClick={() => addTrade("win")} disabled={!entry || !stop}>Log Win</button>
                <button className="btn red" onClick={() => addTrade("loss")} disabled={!entry || !stop}>Log Loss</button>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>20 Trade Stress Test</h2>
                <span className="pill">40% wins / 1:3R</span>
              </div>
              <div className="calc-list">
                <CalcRow label="8 wins" value={`+${compactUsd(riskAmount * 24, 2)}`} tone="positive" />
                <CalcRow label="12 losses" value={`-${compactUsd(riskAmount * 12, 2)}`} tone="negative" />
                <CalcRow label="Expected net" value={`+${compactUsd(expectedMonthly, 2)}`} tone="positive" />
                <CalcRow label="ROI" value={`${number(accountBalance ? (expectedMonthly / accountBalance) * 100 : 0, 1)}%`} tone="amber" />
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Local Trade Database</h2>
                <span className="pill">{activeTrades.length} active / {wins}W / {losses}L / {compactUsd(totalPnl, 2)}</span>
              </div>
              {trades.length ? (
                <div className="journal">
                  {trades.map((trade) => (
                    <div className="trade" key={trade.id}>
                      <span className={`badge ${trade.direction === "LONG" ? "positive" : "negative"}`} style={{
                        border: `1px solid ${trade.direction === "LONG" ? "rgba(25,211,125,0.34)" : "rgba(255,77,95,0.34)"}`,
                        background: trade.direction === "LONG" ? "rgba(25,211,125,0.08)" : "rgba(255,77,95,0.08)",
                      }}>
                        {trade.direction}
                      </span>
                      <div>
                        <div className="mono" style={{ fontSize: 12 }}>
                          {trade.status} / {compactUsd(trade.entry, 0)} to {compactUsd(trade.tp2 || trade.target, 0)}
                        </div>
                        <div className="label" style={{ margin: "4px 0 0" }}>
                          SL {compactUsd(trade.stop, 0)} / {trade.openedAt ? new Date(trade.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : trade.time}
                        </div>
                      </div>
                      <div className="trade-actions">
                        <strong className={trade.pnl >= 0 ? "positive" : "negative"}>{trade.pnl >= 0 ? "+" : ""}{compactUsd(trade.pnl, 2)}</strong>
                        {trade.status === "ACTIVE" ? (
                          <button className="btn" onClick={() => closeTradeManual(trade.id)}>Close</button>
                        ) : null}
                        <button className="btn red" onClick={() => removeTrade(trade.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">No local trades stored. Approve an AI setup or log a manual trade.</div>
              )}
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Market Impact News</h2>
                <span className={`pill ${newsStatus === "live" ? "good" : newsStatus === "fallback" ? "bad" : ""}`}>
                  {newsStatus.toUpperCase()} / WATCHLIST
                </span>
              </div>
              <div className="news-list">
                {news.map((item) => (
                  <div className="news-item" key={item.id}>
                    <div className="news-meta">
                      <span>{item.source}</span>
                      <span className={`impact ${item.impact.toLowerCase()}`}>{item.impact} IMPACT</span>
                    </div>
                    <a className="news-title" href={item.link} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                    <div className="news-meta">
                      <span>Driver: {item.reason}</span>
                      <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "live"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Upcoming Price Triggers</h2>
                <span className="pill">AI context</span>
              </div>
              <div className="news-list">
                {UPCOMING_EVENTS.map((event) => (
                  <div className="news-item" key={event.title}>
                    <div className="news-meta">
                      <span>{event.window}</span>
                      <span className={`impact ${event.impact.toLowerCase()}`}>{event.impact}</span>
                    </div>
                    <div className="news-title">{event.title}</div>
                    <div className="disclaimer">{event.direction}</div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Social / Twitter Trend Proxy</h2>
                <span className="pill">Local scan</span>
              </div>
              <div className="button-row">
                {socialTrendProxy.map((trend) => (
                  <span className="pill" key={trend}>{trend}</span>
                ))}
              </div>
              <p className="disclaimer">
                Direct X/Twitter trends need an API key. This local proxy extracts fast-moving market keywords from news until a social API is connected.
              </p>
            </div>
          </Panel>

          <Panel>
            <div className="section">
              <div className="section-title">
                <h2>Local AI</h2>
                <span className={`pill ${ollamaStatus === "ok" ? "good" : ollamaStatus === "error" ? "bad" : ""}`}>
                  {ollamaStatus.toUpperCase()}
                </span>
              </div>
              <div className="field">
                <label className="label">Ollama thinking model</label>
                <input value={ollamaModel} onChange={(event) => setOllamaModel(event.target.value.trim())} />
              </div>
              <p className="disclaimer">
                Default is lfm2.5-thinking. This assistant is a planning and risk-control interface, not financial advice. Use hard stops, small risk, and a trade plan you can execute without improvising.
              </p>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
