import { useCallback, useEffect, useState } from "react";
import { C } from "../constants.js";
import { fmtNum } from "../utils/formatters.js";

const BOOKS_URL = "http://127.0.0.1:5001";
const CATEGORY_COLORS = {
  psychology: C.purple,
  technical_analysis: C.cyan,
  risk_management: C.amber,
  macro: C.blue,
  quantitative: C.green,
  wisdom: C.amber,
  fundamentals: C.sub,
};

const Badge = ({ text, color }) => (
  <span style={{
    padding: "2px 7px", borderRadius: 3, fontSize: 9, fontFamily: C.mono, fontWeight: 700,
    color, background: color + "20", border: `1px solid ${color}33`, textTransform: "uppercase",
  }}>{text}</span>
);

function ProbabilityBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontFamily: C.mono, color: C.sub }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: C.mono, color: color || C.ink }}>{fmtNum(value, 0)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: C.bg, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`,
          background: value >= 65 ? C.green : value <= 35 ? C.red : C.amber,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

export default function BooksPanel({ ticker, indicators }) {
  const [serverOnline, setServerOnline] = useState(false);
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookDetail, setBookDetail] = useState(null);
  const [probability, setProbability] = useState(null);
  const [probLoading, setProbLoading] = useState(false);
  const [view, setView] = useState("books"); // books | probability

  useEffect(() => {
    fetch(`${BOOKS_URL}/health`)
      .then((r) => r.ok && setServerOnline(true))
      .catch(() => setServerOnline(false));

    fetch(`${BOOKS_URL}/books`)
      .then((r) => r.json())
      .then((d) => setBooks(d.books || []))
      .catch(() => {});
  }, []);

  const loadBook = useCallback(async (key) => {
    setSelectedBook(key);
    setBookDetail(null);
    try {
      const r = await fetch(`${BOOKS_URL}/book/${key}`);
      const d = await r.json();
      setBookDetail(d);
    } catch {
      setBookDetail({ error: "Failed to load book" });
    }
  }, []);

  const runProbability = useCallback(async () => {
    setProbLoading(true);
    try {
      const body = {
        price: ticker?.price,
        rsi: indicators?.rsi,
        macd_hist: indicators?.macd?.hist,
        bb_pct_b: indicators?.bb?.pct != null ? indicators.bb.pct / 100 : null,
        ema21: indicators?.ema21,
        ema55: indicators?.ema55,
        stoch_k: indicators?.stoch?.k,
        stoch_d: indicators?.stoch?.d,
        news_sentiment: "neutral",
      };
      const r = await fetch(`${BOOKS_URL}/probability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      setProbability(d);
    } catch {
      setProbability({ error: "Books server offline — run: python books_server.py" });
    } finally {
      setProbLoading(false);
    }
  }, [ticker, indicators]);

  const openCli = useCallback(async () => {
    try {
      await fetch(`${BOOKS_URL}/open-cli`, { method: "POST" });
    } catch {
      alert("Books server offline. Run: python books_server.py first.");
    }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, padding: "6px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {["books", "probability"].map((v) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "5px 12px", border: "none", cursor: "pointer", borderRadius: 4,
            fontFamily: C.mono, fontSize: 10, fontWeight: 600, textTransform: "uppercase",
            background: view === v ? C.panel2 : "transparent",
            color: view === v ? C.ink : C.muted,
            borderBottom: view === v ? `2px solid ${C.cyan}` : "2px solid transparent",
          }}>{v}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, fontFamily: C.mono, color: serverOnline ? C.green : C.red }}>
            {serverOnline ? "● server online" : "○ server offline"}
          </span>
          <button onClick={openCli} style={{
            padding: "3px 8px", cursor: "pointer", borderRadius: 3,
            background: C.bg, color: C.cyan, fontFamily: C.mono, fontSize: 9,
            border: `1px solid ${C.border}`,
          }}>Open CLI</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {view === "books" && (
          <div style={{ display: "flex", height: "100%" }}>
            {/* Book list */}
            <div style={{ width: 170, borderRight: `1px solid ${C.border}`, overflowY: "auto", flexShrink: 0 }}>
              {books.length === 0 && (
                <div style={{ padding: 12, fontSize: 10, fontFamily: C.mono, color: C.muted, textAlign: "center" }}>
                  {serverOnline ? "Loading..." : "Start books_server.py"}
                </div>
              )}
              {books.map((b) => (
                <div
                  key={b.key}
                  onClick={() => loadBook(b.key)}
                  style={{
                    padding: "8px 10px", cursor: "pointer",
                    background: selectedBook === b.key ? C.panel2 : "transparent",
                    borderBottom: `1px solid ${C.border}`,
                    borderLeft: selectedBook === b.key ? `3px solid ${CATEGORY_COLORS[b.category] || C.cyan}` : "3px solid transparent",
                    transition: "all 0.1s",
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: C.sans, color: C.ink, fontWeight: 600, lineHeight: 1.3, marginBottom: 3 }}>
                    {b.title}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, marginBottom: 4 }}>{b.author}</div>
                  <Badge text={b.category.replace("_", " ")} color={CATEGORY_COLORS[b.category] || C.cyan} />
                </div>
              ))}
            </div>

            {/* Book detail */}
            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              {!selectedBook && (
                <div style={{ textAlign: "center", paddingTop: 40, color: C.muted, fontFamily: C.mono, fontSize: 11 }}>
                  Select a book to view principles
                </div>
              )}
              {bookDetail?.error && (
                <div style={{ color: C.red, fontFamily: C.mono, fontSize: 11 }}>{bookDetail.error}</div>
              )}
              {bookDetail && !bookDetail.error && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontFamily: C.sans, color: C.ink, fontWeight: 700, marginBottom: 2 }}>
                      {bookDetail.title}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: C.mono, color: C.muted, marginBottom: 8 }}>
                      {bookDetail.author}
                    </div>
                    <div style={{
                      padding: "8px 10px", borderRadius: C.radius,
                      background: C.bg, border: `1px solid ${C.border}`,
                      fontSize: 11, fontFamily: C.sans, color: C.sub, lineHeight: 1.6,
                    }}>
                      {bookDetail.core_thesis}
                    </div>
                  </div>

                  <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>
                    Key Principles ({(bookDetail.principles || []).length})
                  </div>
                  {(bookDetail.principles || []).map((p, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 8, padding: "6px 0",
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                      <span style={{ fontSize: 11, fontFamily: C.sans, color: C.sub, lineHeight: 1.6 }}>{p}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {view === "probability" && (
          <div style={{ padding: 14 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: C.mono, color: C.sub, marginBottom: 10, lineHeight: 1.6 }}>
                Combines all 20 books: RSI/MACD/BB/EMA scoring (Murphy + Elder), candle patterns (Nison + Brooks), macro context (Dalio + Gliner), and news sentiment to output directional probability.
              </div>
              <button onClick={runProbability} disabled={probLoading} style={{
                width: "100%", padding: "10px 0", borderRadius: C.radius, border: "none",
                cursor: probLoading ? "wait" : "pointer",
                background: probLoading ? C.bg : C.panel2, color: C.cyan,
                fontFamily: C.mono, fontSize: 12, fontWeight: 700,
                borderBottom: `2px solid ${probLoading ? "transparent" : C.cyan}`,
              }}>
                {probLoading ? "Analyzing with Books Knowledge..." : "Run Probability Analysis"}
              </button>
            </div>

            {probability?.error && (
              <div style={{ padding: "10px 12px", borderRadius: C.radius, background: C.redDim, color: C.red, fontFamily: C.mono, fontSize: 11 }}>
                {probability.error}
              </div>
            )}

            {probability && !probability.error && (
              <>
                {/* Direction + Confidence */}
                <div style={{
                  padding: "12px 14px", borderRadius: C.radius, marginBottom: 12,
                  background: probability.direction === "LONG" ? C.greenDim : probability.direction === "SHORT" ? C.redDim : C.amberDim,
                  border: `1px solid ${probability.direction === "LONG" ? C.green : probability.direction === "SHORT" ? C.red : C.amber}33`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontSize: 16, fontFamily: C.mono, fontWeight: 700,
                      color: probability.direction === "LONG" ? C.green : probability.direction === "SHORT" ? C.red : C.amber,
                    }}>
                      {probability.direction === "LONG" ? "▲" : probability.direction === "SHORT" ? "▼" : "◆"} {probability.direction}
                    </span>
                    <span style={{ fontSize: 13, fontFamily: C.mono, color: C.ink, fontWeight: 700 }}>
                      {probability.confidence}% confidence
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: C.mono, color: C.green }}>
                      Long: {probability.probability_long}%
                    </span>
                    <span style={{ fontSize: 11, fontFamily: C.mono, color: C.red }}>
                      Short: {probability.probability_short}%
                    </span>
                  </div>
                </div>

                {/* Component Scores */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>
                    Component Scores (Books-Weighted)
                  </div>
                  {Object.entries(probability.component_scores || {}).map(([key, val]) => (
                    <ProbabilityBar
                      key={key}
                      label={key.replace(/_/g, " ")}
                      value={val}
                    />
                  ))}
                </div>

                {/* Books Reasoning */}
                {probability.books_reasoning?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>
                      Books Reasoning
                    </div>
                    {probability.books_reasoning.map((r, i) => (
                      <div key={i} style={{ fontSize: 10, fontFamily: C.sans, color: C.sub, padding: "4px 0", borderBottom: `1px solid ${C.border}`, lineHeight: 1.5 }}>
                        · {r}
                      </div>
                    ))}
                  </div>
                )}

                {/* Risk Notes */}
                {probability.risk_notes?.length > 0 && (
                  <div style={{ padding: "10px 12px", borderRadius: C.radius, background: C.amberDim, border: `1px solid ${C.amber}22` }}>
                    <div style={{ fontSize: 10, fontFamily: C.mono, color: C.amber, fontWeight: 700, marginBottom: 6 }}>
                      RISK NOTES (Tharp + Hull + Douglas)
                    </div>
                    {probability.risk_notes.map((n, i) => (
                      <div key={i} style={{ fontSize: 10, fontFamily: C.mono, color: C.sub, marginBottom: 3 }}>⚠ {n}</div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, marginTop: 10, textAlign: "right" }}>
                  {probability.timestamp}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
