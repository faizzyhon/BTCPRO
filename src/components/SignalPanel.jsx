import { useMemo } from "react";
import { C } from "../constants.js";
import { fmtUsd, fmtNum, clamp } from "../utils/formatters.js";

const Row = ({ label, value, color, sub }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "5px 0", borderBottom: `1px solid ${C.border}`,
  }}>
    <span style={{ fontSize: 11, fontFamily: C.mono, color: C.sub }}>{label}</span>
    <div style={{ textAlign: "right" }}>
      <span style={{ fontSize: 11, fontFamily: C.mono, color: color || C.ink, fontWeight: 600 }}>{value}</span>
      {sub && <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted }}>{sub}</div>}
    </div>
  </div>
);

function Gauge({ label, value, min = 0, max = 100 }) {
  const pct = clamp(((value - min) / (max - min)) * 100, 0, 100);
  const color = value <= 30 ? C.green : value >= 70 ? C.red : value >= 55 ? C.amber : C.blue;
  const zone = value <= 20 ? "OVERSOLD" : value >= 80 ? "OVERBOUGHT" : value <= 30 ? "Low" : value >= 70 ? "High" : "Neutral";

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
        <span style={{ fontSize: 10, fontFamily: C.mono, color: C.sub }}>{label}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 9, fontFamily: C.mono, color, background: color + "18", padding: "1px 5px", borderRadius: 3 }}>
            {zone}
          </span>
          <span style={{ fontSize: 11, fontFamily: C.mono, color, fontWeight: 700 }}>{fmtNum(value, 1)}</span>
        </div>
      </div>
      <div style={{ height: 4, background: C.dim, borderRadius: 2, overflow: "hidden", position: "relative" }}>
        {/* zone markers */}
        <div style={{ position: "absolute", left: "30%", top: 0, bottom: 0, width: 1, background: C.green + "40" }} />
        <div style={{ position: "absolute", left: "70%", top: 0, bottom: 0, width: 1, background: C.red + "40" }} />
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 2, transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

function SignalBadge({ label, signal, reason }) {
  const color = signal === "BUY" ? C.green : signal === "SELL" ? C.red : C.amber;
  const icon  = signal === "BUY" ? "▲" : signal === "SELL" ? "▼" : "◆";
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 8px", borderRadius: C.radius,
      background: color + "0E",
      border: `1px solid ${color}22`,
      marginBottom: 3,
    }}>
      <span style={{ fontSize: 11, fontFamily: C.mono, color: C.sub }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {reason && <span style={{ fontSize: 9, fontFamily: C.mono, color: C.muted }}>{reason}</span>}
        <span style={{ fontSize: 10, fontFamily: C.mono, fontWeight: 800, color }}>
          {icon} {signal}
        </span>
      </div>
    </div>
  );
}

function BiasHeader({ bias, confidence, buyCount, sellCount }) {
  const isLong  = bias === "LONG";
  const isShort = bias === "SHORT";
  const color   = isLong ? C.green : isShort ? C.red : C.amber;
  const longPct = ((buyCount / Math.max(buyCount + sellCount, 1)) * 100).toFixed(0);

  return (
    <div style={{
      padding: "10px 12px", borderRadius: C.radius2,
      background: color + "0C",
      border: `1px solid ${color}22`,
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>Market Bias</div>
          <div style={{ fontSize: 16, fontFamily: C.mono, fontWeight: 800, color }}>
            {isLong ? "▲" : isShort ? "▼" : "◆"} {bias}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", marginBottom: 3 }}>Confidence</div>
          <div style={{ fontSize: 20, fontFamily: C.mono, fontWeight: 800, color }}>{confidence}%</div>
        </div>
      </div>

      {/* Bull/Bear bar */}
      <div style={{ height: 6, borderRadius: 3, background: C.dim, overflow: "hidden" }}>
        <div style={{
          width: `${longPct}%`, height: "100%",
          background: `linear-gradient(90deg, ${C.red}, ${C.green})`,
          transition: "width 0.5s",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 9, fontFamily: C.mono, color: C.red }}>{sellCount} BEAR</span>
        <span style={{ fontSize: 9, fontFamily: C.mono, color: C.green }}>{buyCount} BULL</span>
      </div>
    </div>
  );
}

export default function SignalPanel({ indicators, ticker }) {
  const { rsi = 50, bb, macd, stoch, atr = 0, ema21 = 0, ema55 = 0, vwap = 0 } = indicators;
  const price = ticker?.price || 0;

  const signals = useMemo(() => {
    const list = [];
    if (rsi < 30)       list.push({ label: "RSI(14)",   signal: "BUY",  reason: `${fmtNum(rsi,1)} oversold`  });
    else if (rsi > 70)  list.push({ label: "RSI(14)",   signal: "SELL", reason: `${fmtNum(rsi,1)} overbought` });
    else                list.push({ label: "RSI(14)",   signal: "HOLD", reason: fmtNum(rsi, 1)               });

    if      (ema21 > ema55) list.push({ label: "EMA Cross", signal: "BUY",  reason: "21 > 55 bullish" });
    else if (ema21 < ema55) list.push({ label: "EMA Cross", signal: "SELL", reason: "21 < 55 bearish" });

    if      (bb?.pct <= 10) list.push({ label: "Bollinger",  signal: "BUY",  reason: "Near lower band" });
    else if (bb?.pct >= 90) list.push({ label: "Bollinger",  signal: "SELL", reason: "Near upper band" });

    if      (macd?.hist > 0 && macd?.macd > 0) list.push({ label: "MACD", signal: "BUY",  reason: "Bull histogram" });
    else if (macd?.hist < 0 && macd?.macd < 0) list.push({ label: "MACD", signal: "SELL", reason: "Bear histogram" });
    else                                        list.push({ label: "MACD", signal: "HOLD", reason: "Neutral"        });

    if      (stoch?.k < 20 && stoch?.d < 20)   list.push({ label: "Stoch K/D", signal: "BUY",  reason: "Both oversold"   });
    else if (stoch?.k > 80 && stoch?.d > 80)   list.push({ label: "Stoch K/D", signal: "SELL", reason: "Both overbought" });

    if (price && vwap) {
      if      (price > vwap * 1.002) list.push({ label: "VWAP", signal: "BUY",  reason: "Above VWAP" });
      else if (price < vwap * 0.998) list.push({ label: "VWAP", signal: "SELL", reason: "Below VWAP" });
    }

    return list;
  }, [rsi, bb, macd, stoch, ema21, ema55, price, vwap]);

  const buyCount  = signals.filter((s) => s.signal === "BUY").length;
  const sellCount = signals.filter((s) => s.signal === "SELL").length;
  const total     = signals.length;
  const bias      = buyCount > sellCount ? "LONG" : sellCount > buyCount ? "SHORT" : "NEUTRAL";
  const confidence = total ? Math.round(Math.max(buyCount, sellCount) / total * 100) : 50;

  return (
    <div style={{ padding: "10px 12px", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
      <BiasHeader bias={bias} confidence={confidence} buyCount={buyCount} sellCount={sellCount} />

      <div>
        <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Oscillators
        </div>
        <Gauge label="RSI (14)"  value={rsi}            />
        <Gauge label="Stoch %K"  value={stoch?.k || 50} />
        <Gauge label="BB %B"     value={bb?.pct   || 50} />
      </div>

      <div>
        <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Signals
        </div>
        {signals.map((s, i) => <SignalBadge key={i} {...s} />)}
      </div>

      <div>
        <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          Key Levels
        </div>
        <Row label="EMA 21"   value={fmtUsd(ema21, 0)} color={price > ema21 ? C.green : C.red} />
        <Row label="EMA 55"   value={fmtUsd(ema55, 0)} color={price > ema55 ? C.green : C.red} />
        <Row label="VWAP"     value={fmtUsd(vwap,  0)} color={price > vwap  ? C.green : C.red} />
        <Row label="BB Upper" value={fmtUsd(bb?.upper || 0, 0)} />
        <Row label="BB Mid"   value={fmtUsd(bb?.mid   || 0, 0)} />
        <Row label="BB Lower" value={fmtUsd(bb?.lower || 0, 0)} />
        <Row label="ATR (14)" value={fmtUsd(atr, 0)} sub="volatility" />
        <Row label="MACD"     value={fmtNum(macd?.macd || 0)} color={macd?.macd > 0 ? C.green : C.red} />
      </div>
    </div>
  );
}
