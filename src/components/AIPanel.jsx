import { useCallback, useState } from "react";
import { C, STORAGE_KEYS, DEFAULT_MODEL } from "../constants.js";
import { readStore, writeStore } from "../utils/storage.js";
import { fmtUsd, fmtNum } from "../utils/formatters.js";

const BOOKS_URL = "http://127.0.0.1:5001";

async function fetchBooksContext(marketData) {
  try {
    const r = await fetch(`${BOOKS_URL}/ai-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(marketData),
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return "";
    const d = await r.json();
    return d.context || "";
  } catch { return ""; }
}

function buildPrompt({ ticker, indicators, timeframe, booksContext }) {
  const { rsi, ema21, ema55, bb, macd, stoch, atr, vwap } = indicators;
  const p = ticker?.price;
  const booksSection = booksContext
    ? `\n\n${booksContext}\n`
    : `\nBOOKS CONTEXT: Douglas (think in probabilities), Tharp (1-2% risk), Hull (leverage liq = entry×(1-1/lev)), Nison (confirm patterns), Murphy (trend + volume), Dalio (macro matters).\n`;

  return `You are an elite BTC futures derivatives trader. Analyze live market data and return a precise futures trade plan.
${booksSection}
LIVE DATA — BTC-PERP ${timeframe.toUpperCase()}:
Price: $${p?.toFixed(0) ?? "N/A"} | RSI: ${fmtNum(rsi)} | EMA21: $${fmtNum(ema21,0)} | EMA55: $${fmtNum(ema55,0)}
VWAP: $${fmtNum(vwap,0)} | BB: [$${fmtNum(bb?.lower,0)} · $${fmtNum(bb?.mid,0)} · $${fmtNum(bb?.upper,0)}] %B:${fmtNum(bb?.pct,1)}%
MACD: ${fmtNum(macd?.macd,1)} Sig:${fmtNum(macd?.signal,1)} Hist:${fmtNum(macd?.hist,1)} | Stoch K/D: ${fmtNum(stoch?.k,1)}/${fmtNum(stoch?.d,1)} | ATR: $${fmtNum(atr,0)}
Price vs EMA21: ${p > ema21 ? "ABOVE ▲" : "BELOW ▼"} | vs EMA55: ${p > ema55 ? "ABOVE ▲" : "BELOW ▼"} | vs VWAP: ${p > vwap ? "ABOVE ▲" : "BELOW ▼"}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "bias": "LONG|SHORT|NEUTRAL",
  "confidence": 0-100,
  "summary": "2-3 sentence futures market read",
  "entry": {"price": number, "zone": "description"},
  "stop": {"price": number, "reason": "description"},
  "targets": [{"price": number, "label": "TP1|TP2|TP3"}],
  "risks": ["risk1", "risk2"],
  "signals": [{"name": "indicator", "reading": "value", "interpretation": "bullish|bearish|neutral"}],
  "books_note": "one book principle applied"
}`;
}

const Badge = ({ text, color }) => (
  <span style={{
    padding: "2px 7px", borderRadius: 3, fontSize: 9, fontFamily: C.mono, fontWeight: 800,
    color, background: color + "18", border: `1px solid ${color}28`, textTransform: "uppercase",
  }}>{text}</span>
);

const Row = ({ label, value, color }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "5px 0", borderBottom: `1px solid ${C.border}`,
  }}>
    <span style={{ fontSize: 10, fontFamily: C.mono, color: C.muted }}>{label}</span>
    <span style={{ fontSize: 11, fontFamily: C.mono, color: color || C.ink, fontWeight: 600 }}>{value}</span>
  </div>
);

function ConfidenceBar({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: C.dim, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${value}%`, height: "100%",
          background: `linear-gradient(90deg, ${color}66, ${color})`,
          transition: "width 0.6s ease", borderRadius: 3,
        }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: C.mono, color, fontWeight: 700, flexShrink: 0 }}>
        {value}%
      </span>
    </div>
  );
}

export default function AIPanel({ ticker, indicators, timeframe, onTakeTrade }) {
  const [model, setModel] = useState(() => readStore(STORAGE_KEYS.model, DEFAULT_MODEL));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [booksUsed, setBooksUsed] = useState(false);
  const [raw, setRaw] = useState("");

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBooksUsed(false);

    // Try to get books context from server (non-blocking)
    const booksContext = await fetchBooksContext({
      price: ticker?.price,
      rsi: indicators?.rsi,
      macd_hist: indicators?.macd?.hist,
      bb_pct_b: indicators?.bb?.pct != null ? indicators.bb.pct / 100 : null,
      ema21: indicators?.ema21,
      ema55: indicators?.ema55,
      stoch_k: indicators?.stoch?.k,
      stoch_d: indicators?.stoch?.d,
    });
    if (booksContext) setBooksUsed(true);

    const ollamaBase = readStore(STORAGE_KEYS.ollamaUrl, "http://localhost:11434");
    const prompt = buildPrompt({ ticker, indicators, timeframe, booksContext });

    try {
      const res = await fetch(`${ollamaBase}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false }),
      });
      if (!res.ok) throw new Error(`Ollama ${res.status}`);
      const data = await res.json();
      const text = data.response || "";
      setRaw(text);
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      setAnalysis(JSON.parse(jsonStr.trim()));
    } catch (err) {
      setError(err.message);
      if (raw) { try { setAnalysis(JSON.parse(raw)); } catch { } }
    } finally {
      setLoading(false);
    }
  }, [ticker, indicators, timeframe, model, raw]);

  const biasColor = analysis?.bias === "LONG" ? C.green : analysis?.bias === "SHORT" ? C.red : C.amber;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{
              position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
              fontSize: 9, fontFamily: C.mono, color: C.muted, pointerEvents: "none",
            }}>MODEL</span>
            <input
              value={model}
              onChange={(e) => { setModel(e.target.value); writeStore(STORAGE_KEYS.model, e.target.value); }}
              placeholder="ollama model name"
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: 52, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                background: C.dim, border: `1px solid ${C.border}`,
                borderRadius: C.radius, color: C.sub, fontFamily: C.mono, fontSize: 11, outline: "none",
              }}
            />
          </div>
          <button
            onClick={analyze}
            disabled={loading}
            style={{
              padding: "7px 16px", borderRadius: C.radius, border: "none",
              cursor: loading ? "wait" : "pointer",
              background: loading ? C.dim : C.cyanDim,
              color: loading ? C.muted : C.cyan,
              fontFamily: C.mono, fontSize: 11, fontWeight: 800,
              borderBottom: `2px solid ${loading ? "transparent" : C.cyan}`,
              flexShrink: 0, transition: "all 0.12s",
            }}
          >{loading ? "Analyzing…" : "Analyze"}</button>
        </div>

        {booksUsed && (
          <div style={{ marginTop: 5, fontSize: 9, fontFamily: C.mono, color: C.green }}>
            ● Books knowledge injected
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {error && (
          <div style={{
            padding: "9px 11px", borderRadius: C.radius,
            background: C.redDim, border: `1px solid ${C.red}22`,
            fontFamily: C.mono, fontSize: 11, color: C.red, marginBottom: 12,
          }}>
            {error}
            <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
              Start Ollama: <code style={{ color: C.amber }}>ollama serve</code>
            </div>
          </div>
        )}

        {!analysis && !loading && !error && (
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 12, fontFamily: C.mono, color: C.sub, marginBottom: 6 }}>
              AI Futures Analysis
            </div>
            <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted }}>
              Click Analyze for entry, SL, TP + risk plan.<br />
              Books knowledge auto-injected if server online.
            </div>
          </div>
        )}

        {loading && (
          <div style={{ paddingTop: 40 }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{
                height: i === 1 ? 80 : 50, borderRadius: C.radius, marginBottom: 8,
                background: `linear-gradient(90deg, ${C.dim} 0%, ${C.panel2} 50%, ${C.dim} 100%)`,
                backgroundSize: "200% 100%",
                animation: `shimmer ${0.8 + i * 0.2}s ease infinite`,
              }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            <div style={{ textAlign: "center", fontSize: 10, fontFamily: C.mono, color: C.muted, marginTop: 8 }}>
              {booksUsed ? "Analyzing with 20 books context…" : "Analyzing market conditions…"}
            </div>
          </div>
        )}

        {analysis && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Bias header */}
            <div style={{
              padding: "12px 14px", borderRadius: C.radius2,
              background: biasColor + "0C",
              border: `1px solid ${biasColor}25`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, marginBottom: 3 }}>DIRECTION</div>
                  <div style={{ fontSize: 20, fontFamily: C.mono, fontWeight: 900, color: biasColor }}>
                    {analysis.bias === "LONG" ? "▲" : analysis.bias === "SHORT" ? "▼" : "◆"} {analysis.bias}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, marginBottom: 3 }}>CONFIDENCE</div>
                  <div style={{ fontSize: 20, fontFamily: C.mono, fontWeight: 900, color: biasColor }}>
                    {analysis.confidence}%
                  </div>
                </div>
              </div>
              <ConfidenceBar value={analysis.confidence} color={biasColor} />
              <p style={{ margin: "10px 0 0", fontSize: 11, fontFamily: C.sans, color: C.sub, lineHeight: 1.55 }}>
                {analysis.summary}
              </p>
              {analysis.books_note && (
                <div style={{ marginTop: 8, fontSize: 10, fontFamily: C.mono, color: C.purple, lineHeight: 1.4 }}>
                  📚 {analysis.books_note}
                </div>
              )}
            </div>

            {/* Entry / SL / TP */}
            {analysis.entry && (
              <div style={{
                padding: "10px 12px", borderRadius: C.radius,
                background: C.dim, border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
                  Trade Setup
                </div>
                <Row label="Entry" value={`${fmtUsd(analysis.entry?.price, 0)}  ${analysis.entry?.zone || ""}`} color={biasColor} />
                {analysis.stop && (
                  <Row label="Stop Loss" value={`${fmtUsd(analysis.stop?.price, 0)}  ${analysis.stop?.reason || ""}`} color={C.red} />
                )}
                {analysis.targets?.map((t, i) => (
                  <Row key={i} label={t.label || `TP${i+1}`} value={fmtUsd(t.price, 0)} color={C.green} />
                ))}
              </div>
            )}

            {/* Indicator reads */}
            {analysis.signals?.length > 0 && (
              <div style={{ padding: "10px 12px", borderRadius: C.radius, background: C.dim, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
                  Indicator Reads
                </div>
                {analysis.signals.map((s, i) => {
                  const col = s.interpretation === "bullish" ? C.green : s.interpretation === "bearish" ? C.red : C.amber;
                  return (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", padding: "4px 0",
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontSize: 10, fontFamily: C.mono, color: C.sub }}>{s.name}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontFamily: C.mono, color: C.muted }}>{s.reading}</span>
                        <Badge text={s.interpretation} color={col} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Risks */}
            {analysis.risks?.length > 0 && (
              <div style={{
                padding: "10px 12px", borderRadius: C.radius,
                background: C.amberDim, border: `1px solid ${C.amber}22`,
              }}>
                <div style={{ fontSize: 9, fontFamily: C.mono, color: C.amber, fontWeight: 800, marginBottom: 6 }}>
                  ⚠ RISK FACTORS
                </div>
                {analysis.risks.map((r, i) => (
                  <div key={i} style={{ fontSize: 10, fontFamily: C.mono, color: C.sub, paddingLeft: 8, marginBottom: 3, lineHeight: 1.5 }}>
                    · {r}
                  </div>
                ))}
              </div>
            )}

            {/* Take / Skip */}
            {analysis.bias !== "NEUTRAL" && onTakeTrade && (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                <button onClick={() => onTakeTrade(analysis)} style={{
                  padding: "11px 0", borderRadius: C.radius, border: "none", cursor: "pointer",
                  background: biasColor + "18", color: biasColor,
                  fontFamily: C.mono, fontSize: 13, fontWeight: 800,
                  borderBottom: `2px solid ${biasColor}`,
                  transition: "all 0.12s",
                }}>
                  ✓ Take Trade
                </button>
                <button onClick={() => setAnalysis(null)} style={{
                  padding: "11px 0", borderRadius: C.radius, border: "none", cursor: "pointer",
                  background: C.dim, color: C.muted,
                  fontFamily: C.mono, fontSize: 12, fontWeight: 600,
                  borderBottom: `2px solid ${C.border}`,
                }}>
                  ✕ Skip
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
