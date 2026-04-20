import { useEffect, useState } from "react";
import { C } from "../constants.js";
import { fetchJson } from "../utils/api.js";
import { fmtNum, fmtPct } from "../utils/formatters.js";

const ASSETS = [
  { key: "gold", label: "Gold", url: "https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=5d", sym: "GC=F" },
  { key: "spx", label: "S&P 500", url: "https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=5d", sym: "SPY" },
  { key: "dxy", label: "DXY", url: "https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=5d", sym: "DX-Y.NYB" },
  { key: "vix", label: "VIX", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d", sym: "^VIX" },
];

function parseYahoo(data) {
  try {
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const prev = meta?.chartPreviousClose || meta?.previousClose;
    const change = prev ? ((price - prev) / prev) * 100 : 0;
    return { price, change };
  } catch {
    return null;
  }
}

function correlationNote(key, change, btcChange) {
  if (!Number.isFinite(change)) return "";
  if (key === "dxy") {
    if (change > 0.3 && btcChange < 0) return "DXY ↑ → BTC pressure";
    if (change < -0.3 && btcChange > 0) return "DXY ↓ → BTC support";
  }
  if (key === "spx") {
    if (Math.sign(change) === Math.sign(btcChange)) return "Correlated move";
    if (change > 0.5 && btcChange < 0) return "BTC/SPX diverging";
  }
  if (key === "vix") {
    if (change > 5) return "Fear spike — risk-off";
    if (change < -5) return "Fear easing — risk-on";
  }
  if (key === "gold") {
    if (change > 1 && btcChange > 0) return "Risk-off bid shared";
    if (change > 1 && btcChange < 0) return "BTC/Gold diverging";
  }
  return "";
}

export default function MacroPanel({ ticker }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const btcChange = ticker?.change24h || 0;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = await Promise.allSettled(
        ASSETS.map(async (a) => {
          const json = await fetchJson(a.url, 8000);
          return { key: a.key, ...parseYahoo(json) };
        })
      );
      if (cancelled) return;
      const next = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value?.price) {
          next[r.value.key] = r.value;
        }
      });
      setData(next);
      setLoading(false);
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Macro Correlations
      </div>

      {loading && (
        <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, textAlign: "center", padding: 12 }}>
          Loading…
        </div>
      )}

      {ASSETS.map(({ key, label }) => {
        const asset = data[key];
        if (!asset) return null;
        const isUp = asset.change >= 0;
        const note = correlationNote(key, asset.change, btcChange);
        return (
          <div key={key} style={{
            padding: "7px 10px", borderRadius: C.radius, marginBottom: 5,
            background: C.bg, border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontFamily: C.mono, color: C.sub }}>{label}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontFamily: C.mono, color: C.ink }}>{fmtNum(asset.price, 2)}</div>
                <div style={{ fontSize: 10, fontFamily: C.mono, color: isUp ? C.green : C.red }}>
                  {fmtPct(asset.change)}
                </div>
              </div>
            </div>
            {note && (
              <div style={{ fontSize: 9, fontFamily: C.mono, color: C.amber, marginTop: 3 }}>
                ⚡ {note}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: C.radius, background: C.bg, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, marginBottom: 3 }}>CORREL GUIDE</div>
        <div style={{ fontSize: 9, fontFamily: C.mono, color: C.sub }}>
          DXY ↑ = BTC pressure · SPX ↓ = BTC risk-off<br />
          VIX {">"} 25 = fear spike · Gold ↑ + BTC ↑ = macro hedge
        </div>
      </div>
    </div>
  );
}
