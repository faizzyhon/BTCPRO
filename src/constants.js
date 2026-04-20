// ─── Design Tokens ───────────────────────────────────────────────────────────
export const C = {
  // Backgrounds
  bg:      "#07090E",
  panel:   "#0C0F16",
  panel2:  "#111520",
  panel3:  "#161C2A",
  dim:     "#1A2030",

  // Borders
  border:       "rgba(255,255,255,0.055)",
  borderBright: "rgba(255,255,255,0.11)",
  borderAccent: "rgba(0,207,255,0.25)",

  // Signal colors
  green:     "#00D97D",
  greenDim:  "rgba(0,217,125,0.09)",
  greenGlow: "rgba(0,217,125,0.22)",
  red:       "#FF3B52",
  redDim:    "rgba(255,59,82,0.09)",
  redGlow:   "rgba(255,59,82,0.22)",
  amber:     "#F0A500",
  amberDim:  "rgba(240,165,0,0.09)",
  blue:      "#2F80ED",
  blueDim:   "rgba(47,128,237,0.09)",
  cyan:      "#00CFFF",
  cyanDim:   "rgba(0,207,255,0.09)",
  purple:    "#9B59B6",

  // Text
  ink:   "#E4EAF6",
  sub:   "#7380A0",
  muted: "#38455A",

  // Fonts
  mono: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
  sans: "'Inter',system-ui,-apple-system,sans-serif",

  // Radius
  radius:  "5px",
  radius2: "8px",
  radius3: "12px",
};

// ─── Timeframes ───────────────────────────────────────────────────────────────
export const TIMEFRAMES = [
  { label: "1m",  value: "1m"  },
  { label: "5m",  value: "5m"  },
  { label: "15m", value: "15m" },
  { label: "1h",  value: "1h"  },
  { label: "4h",  value: "4h"  },
  { label: "1d",  value: "1d"  },
];

// ─── Market Data Sources ──────────────────────────────────────────────────────
export const MARKET_SOURCES = [
  {
    name: "Binance",
    url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
    normalize: (d) => ({
      price: +d.lastPrice,
      change24h: +d.priceChangePercent,
      volume: +d.quoteVolume,
      high24h: +d.highPrice,
      low24h: +d.lowPrice,
    }),
  },
  {
    name: "Coinbase",
    url: "https://api.exchange.coinbase.com/products/BTC-USD/stats",
    normalize: (d) => {
      const open = +d.open, price = +d.last;
      return {
        price,
        change24h: open ? ((price - open) / open) * 100 : 0,
        volume: +d.volume * price,
        high24h: +d.high,
        low24h: +d.low,
      };
    },
  },
  {
    name: "OKX",
    url: "https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT",
    normalize: (d) => {
      const t = d.data?.[0];
      const price = +t?.last, open = +t?.open24h;
      return {
        price,
        change24h: open ? ((price - open) / open) * 100 : 0,
        volume: +t?.volCcy24h,
        high24h: +t?.high24h,
        low24h: +t?.low24h,
      };
    },
  },
];

// ─── Futures / Perp ───────────────────────────────────────────────────────────
export const FUNDING_URL = "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT";
export const OI_URL      = "https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT";
export const KLINES_URL  = (interval) =>
  `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=300`;
export const WS_URL = (interval) =>
  `wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/btcusdt@kline_${interval}`;

// ─── News ─────────────────────────────────────────────────────────────────────
// Primary: CryptoCompare News API (JSON, CORS-enabled, no auth for basic)
export const CRYPTOCOMPARE_NEWS_URL =
  "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,Regulation,Trading,Mining&sortOrder=latest&limit=60";

// RSS fallback feeds — fetched via CORS proxies
export const NEWS_FEEDS = [
  { source: "CoinDesk",     url: "https://www.coindesk.com/arc/outboundfeeds/rss/", weight: 4 },
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss",                  weight: 3 },
  { source: "The Block",    url: "https://www.theblock.co/rss.xml",                 weight: 4 },
  { source: "Decrypt",      url: "https://decrypt.co/feed",                         weight: 3 },
  { source: "Fed Reserve",  url: "https://www.federalreserve.gov/feeds/press_all.xml", weight: 5 },
];

// CORS proxies tried in order — first success wins
export const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
  "https://api.codetabs.com/v1/proxy?quest=",
];

export const NEWS_KEYWORDS = [
  ["ETF", 5], ["Fed", 4], ["rate hike", 4], ["rate cut", 4],
  ["inflation", 3], ["CPI", 4], ["SEC", 4], ["regulation", 3],
  ["liquidation", 4], ["whale", 3], ["reserve", 3],
  ["BlackRock", 4], ["MicroStrategy", 3], ["hack", 5],
  ["war", 4], ["tariff", 4], ["Tether", 3], ["ban", 4],
  ["bankruptcy", 5], ["approval", 3], ["halving", 3],
  ["FOMC", 5], ["interest rate", 4], ["recession", 4], ["BTC", 2],
];

// ─── Storage ──────────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  trades:        "mp.trades.v5",
  balance:       "mp.balance.v5",
  model:         "mp.model.v5",
  alerts:        "mp.alerts.v5",
  closedTrades:  "mp.closed.v5",
  leverage:      "mp.leverage.v5",
  ollamaUrl:     "mp.ollamaUrl.v5",
  defaultRiskPct:"mp.riskPct.v5",
};

// ─── App Config ───────────────────────────────────────────────────────────────
export const OLLAMA_URL      = "/ollama";
export const DEFAULT_MODEL   = "lfm2.5-thinking";
export const DEFAULT_LEVERAGE  = 10;
export const DEFAULT_RISK_PCT  = 1;
export const REFRESH_MS        = 15_000;
export const API_TIMEOUT_MS    = 7_000;
export const NEWS_REFRESH_MS   = 3 * 60 * 1000;   // 3 min
