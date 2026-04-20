import { useState, useMemo } from "react";
import { C } from "../constants.js";
import { fmtUsd, fmtNum, clamp } from "../utils/formatters.js";
import { calcKelly } from "../utils/indicators.js";

const Label = ({ children }) => (
  <label style={{
    fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase",
    letterSpacing: "0.07em", display: "block", marginBottom: 4,
  }}>{children}</label>
);

const NumInput = ({ value, onChange, prefix, min, max, step = "any" }) => (
  <div style={{ position: "relative" }}>
    {prefix && (
      <span style={{
        position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
        fontSize: 10, fontFamily: C.mono, color: C.muted,
      }}>{prefix}</span>
    )}
    <input
      type="number" value={value} min={min} max={max} step={step}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: prefix ? "7px 8px 7px 20px" : "7px 10px",
        background: C.dim, border: `1px solid ${C.border}`,
        borderRadius: C.radius, color: C.ink,
        fontFamily: C.mono, fontSize: 12, outline: "none",
        transition: "border-color 0.12s",
      }}
      onFocus={(e)  => e.target.style.borderColor = C.borderBright}
      onBlur={(e)   => e.target.style.borderColor = C.border}
    />
  </div>
);

const ResultRow = ({ label, value, color, bold, sub }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "5px 0", borderBottom: `1px solid ${C.border}`,
  }}>
    <span style={{ fontSize: 10, fontFamily: C.mono, color: C.sub }}>{label}</span>
    <div style={{ textAlign: "right" }}>
      <span style={{ fontSize: 11, fontFamily: C.mono, color: color || C.ink, fontWeight: bold ? 700 : 400 }}>
        {value}
      </span>
      {sub && <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted }}>{sub}</div>}
    </div>
  </div>
);

export default function PositionCalc({ ticker, indicators, stats, leverage: defaultLeverage = 10, balance: defaultBalance = 10000, onOpenTrade }) {
  const price = ticker?.price || 94000;
  const [dir,      setDir]      = useState("LONG");
  const [entry,    setEntry]    = useState(price.toFixed(0));
  const [stop,     setStop]     = useState((price - (indicators?.atr || 400) * 1.4).toFixed(0));
  const [tp1,      setTp1]      = useState((price + (indicators?.atr || 400) * 2.1).toFixed(0));
  const [leverage, setLeverage] = useState(String(defaultLeverage));
  const [amtUsd,   setAmtUsd]   = useState(String(Math.round(defaultBalance * 0.01)));

  const lev = Math.max(1, Math.min(200, +leverage || 1));
  const amt = Math.max(0, +amtUsd || 0);

  const calc = useMemo(() => {
    const e = +entry, s = +stop, t = +tp1;
    if (!e || !s || Math.abs(e - s) < 0.01) return null;

    const mult      = dir === "LONG" ? 1 : -1;
    const stopDist  = Math.abs(e - s);
    const stopPct   = stopDist / e * 100;
    const posSize   = amt * lev;          // total position in USD
    const sizeBtc   = posSize / e;
    const pnlStop   = (s - e) * mult * sizeBtc;
    const pnlTp1    = t ? (t - e) * mult * sizeBtc : null;
    const rr        = t && stopDist ? Math.abs(t - e) / stopDist : null;
    const liqPrice  = dir === "LONG" ? e * (1 - 1 / lev) : e * (1 + 1 / lev);
    const liqDist   = Math.abs(e - liqPrice);
    const liqPct    = liqDist / e * 100;
    const margin    = amt; // collateral = amount put in
    const kelly     = calcKelly(stats?.winRate || 50, stats?.avgWin || amt * 1.5, stats?.avgLoss || amt);

    return { posSize, sizeBtc, pnlStop, pnlTp1, rr, liqPrice, liqPct, stopDist, stopPct, margin, kelly };
  }, [entry, stop, tp1, lev, amt, dir, stats]);

  const handleOpen = () => {
    if (!calc) return;
    onOpenTrade({
      direction: dir,
      entry:     +entry,
      stop:      +stop,
      tp1:       +tp1,
      amountUsd: amt,
      leverage:  lev,
      sizeBtc:   calc.sizeBtc,
      riskUsd:   Math.abs(calc.pnlStop),
    });
  };

  const dirColor = dir === "LONG" ? C.green : C.red;
  const liqWarning = calc && calc.liqPct < 5;

  return (
    <div style={{ padding: "10px 12px" }}>
      <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Futures Position
      </div>

      {/* Direction */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {["LONG", "SHORT"].map((d) => (
          <button key={d} onClick={() => setDir(d)} style={{
            flex: 1, padding: "9px 0", borderRadius: C.radius, border: "none", cursor: "pointer",
            fontFamily: C.mono, fontSize: 12, fontWeight: 800,
            background: dir === d
              ? (d === "LONG" ? C.greenGlow : C.redGlow)
              : C.dim,
            color: dir === d ? (d === "LONG" ? C.green : C.red) : C.muted,
            borderBottom: dir === d ? `2px solid ${d === "LONG" ? C.green : C.red}` : "2px solid transparent",
            transition: "all 0.12s",
          }}>
            {d === "LONG" ? "▲ LONG" : "▼ SHORT"}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <Label>Amount (USDT)</Label>
            <NumInput value={amtUsd} onChange={setAmtUsd} prefix="$" min="1" />
          </div>
          <div>
            <Label>Leverage ({lev}×)</Label>
            <NumInput value={leverage} onChange={setLeverage} min="1" max="200" step="1" />
          </div>
        </div>

        {/* Leverage slider */}
        <input
          type="range" min="1" max="100" step="1" value={String(lev)}
          onChange={(e) => setLeverage(e.target.value)}
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: C.mono, color: C.muted, marginTop: -4 }}>
          <span>1×</span>
          <span style={{ color: lev > 25 ? C.red : lev > 10 ? C.amber : C.green }}>{lev}× leverage</span>
          <span>100×</span>
        </div>

        <div>
          <Label>Entry Price</Label>
          <NumInput value={entry} onChange={setEntry} prefix="$" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <Label>Stop Loss</Label>
            <NumInput value={stop} onChange={setStop} prefix="$" />
          </div>
          <div>
            <Label>Take Profit</Label>
            <NumInput value={tp1} onChange={setTp1} prefix="$" />
          </div>
        </div>
      </div>

      {/* Results */}
      {calc && (
        <div style={{ marginBottom: 12 }}>
          <ResultRow label="Position Size"   value={fmtUsd(calc.posSize)}  bold />
          <ResultRow label="Margin (locked)" value={fmtUsd(calc.margin)}   color={C.sub} />
          <ResultRow label="Size (BTC)"      value={`${calc.sizeBtc.toFixed(5)} BTC`} />
          <ResultRow label="Stop Distance"   value={`${fmtUsd(calc.stopDist)} (${fmtNum(calc.stopPct, 2)}%)`} />
          {calc.rr != null && (
            <ResultRow label="R:R Ratio" value={`1 : ${fmtNum(calc.rr)}`}
              color={calc.rr >= 2 ? C.green : calc.rr >= 1.5 ? C.amber : C.red} />
          )}
          <ResultRow label="If SL hit"  value={`${calc.pnlStop >= 0 ? "+" : ""}${fmtUsd(calc.pnlStop)}`} color={C.red} />
          {calc.pnlTp1 != null && (
            <ResultRow label="If TP hit" value={`+${fmtUsd(calc.pnlTp1)}`} color={C.green} />
          )}
          <ResultRow
            label="Liquidation"
            value={fmtUsd(calc.liqPrice, 0)}
            color={liqWarning ? C.red : C.amber}
            sub={`${fmtNum(calc.liqPct, 1)}% from entry`}
          />
        </div>
      )}

      {/* Liq warning */}
      {liqWarning && (
        <div style={{
          padding: "7px 10px", borderRadius: C.radius,
          background: C.redDim, border: `1px solid ${C.red}33`,
          fontSize: 10, fontFamily: C.mono, color: C.red,
          marginBottom: 10,
        }}>
          ⚠ Liquidation {fmtNum(calc.liqPct, 1)}% from entry — very high leverage risk
        </div>
      )}

      <button onClick={handleOpen} disabled={!calc} style={{
        width: "100%", padding: "11px 0", borderRadius: C.radius, border: "none",
        cursor: calc ? "pointer" : "not-allowed",
        fontFamily: C.mono, fontSize: 13, fontWeight: 800,
        background: dir === "LONG" ? C.greenGlow : C.redGlow,
        color: dirColor,
        borderBottom: `2px solid ${dirColor}`,
        opacity: calc ? 1 : 0.5,
        transition: "all 0.12s",
      }}>
        {dir === "LONG" ? "▲" : "▼"} Open {dir} Position
      </button>
    </div>
  );
}
