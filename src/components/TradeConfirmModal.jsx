import { useState } from "react";
import { C } from "../constants.js";
import { fmtUsd, fmtNum } from "../utils/formatters.js";

const Overlay = ({ children }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.82)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    {children}
  </div>
);

const Row = ({ label, value, color }) => (
  <div style={{
    display: "flex", justifyContent: "space-between",
    padding: "5px 0", borderBottom: `1px solid ${C.border}`,
  }}>
    <span style={{ fontSize: 11, fontFamily: C.mono, color: C.muted }}>{label}</span>
    <span style={{ fontSize: 12, fontFamily: C.mono, color: color || C.ink, fontWeight: 600 }}>{value}</span>
  </div>
);

export default function TradeConfirmModal({ analysis, ticker, defaultLeverage, defaultBalance, onTake, onSkip, onWait }) {
  const price = ticker?.price || 0;
  const [amountUsd, setAmountUsd] = useState(String(Math.round(defaultBalance * 0.01)));
  const [leverage, setLeverage] = useState(String(defaultLeverage || 10));

  if (!analysis) return null;

  const lev = Math.max(1, Math.min(200, +leverage || 1));
  const amt = +amountUsd || 0;
  const positionValue = amt * lev;
  const entry = analysis.entry?.price || price;
  const sl = analysis.stop?.price || 0;
  const tp = analysis.targets?.[0]?.price || 0;
  const dirMult = analysis.bias === "LONG" ? 1 : -1;

  const pnlSl = sl && entry ? ((sl - entry) / entry) * dirMult * lev * amt : null;
  const pnlTp = tp && entry ? ((tp - entry) / entry) * dirMult * lev * amt : null;
  const liqPrice = entry
    ? analysis.bias === "LONG"
      ? entry * (1 - 1 / lev)
      : entry * (1 + 1 / lev)
    : null;

  const biasColor = analysis.bias === "LONG" ? C.green : analysis.bias === "SHORT" ? C.red : C.amber;
  const rr = sl && tp && entry ? Math.abs(tp - entry) / Math.abs(sl - entry) : null;

  const handleTake = () => {
    onTake({
      direction: analysis.bias,
      entry,
      stop: sl,
      tp1: tp,
      amountUsd: amt,
      leverage: lev,
      sizeBtc: positionValue / entry,
      riskUsd: pnlSl ? Math.abs(pnlSl) : 0,
      confidence: analysis.confidence,
      aiSummary: analysis.summary,
    });
  };

  return (
    <Overlay>
      <div style={{
        width: 420, background: C.panel,
        border: `1px solid ${C.border}`, borderRadius: C.radius2,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "12px 16px",
          background: biasColor + "18",
          borderBottom: `1px solid ${biasColor}33`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <span style={{ fontSize: 13, fontFamily: C.mono, fontWeight: 700, color: biasColor }}>
              {analysis.bias === "LONG" ? "▲" : "▼"} {analysis.bias} SIGNAL
            </span>
            <span style={{ fontSize: 11, fontFamily: C.mono, color: C.muted, marginLeft: 10 }}>
              {analysis.confidence}% confidence
            </span>
          </div>
          <span style={{ fontSize: 10, fontFamily: C.mono, color: C.muted }}>AI Suggestion</span>
        </div>

        <div style={{ padding: "14px 16px" }}>
          {/* Summary */}
          <p style={{ margin: "0 0 12px", fontSize: 11, fontFamily: C.sans, color: C.sub, lineHeight: 1.6 }}>
            {analysis.summary}
          </p>

          {/* Trade Details */}
          <div style={{ marginBottom: 14 }}>
            <Row label="Entry Zone" value={fmtUsd(entry)} color={C.ink} />
            <Row label="Stop Loss" value={fmtUsd(sl)} color={C.red} />
            <Row label="Take Profit 1" value={fmtUsd(tp)} color={C.green} />
            {rr && <Row label="Risk:Reward" value={`1 : ${fmtNum(rr)}`} color={rr >= 2 ? C.green : C.amber} />}
          </div>

          {/* Amount + Leverage inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, display: "block", marginBottom: 4 }}>
                AMOUNT (USD)
              </label>
              <input
                type="number"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "7px 10px", background: C.bg, border: `1px solid ${C.borderBright}`,
                  borderRadius: C.radius, color: C.ink, fontFamily: C.mono, fontSize: 12, outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, display: "block", marginBottom: 4 }}>
                LEVERAGE ({lev}×)
              </label>
              <input
                type="range" min="1" max="100" step="1"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                style={{ width: "100%", marginTop: 6 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: C.mono, color: C.muted }}>
                <span>1×</span><span style={{ color: C.cyan }}>{lev}×</span><span>100×</span>
              </div>
            </div>
          </div>

          {/* Position Preview */}
          <div style={{
            padding: "10px 12px", borderRadius: C.radius,
            background: C.bg, border: `1px solid ${C.border}`, marginBottom: 14,
          }}>
            <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, marginBottom: 8, textTransform: "uppercase" }}>
              Position Preview
            </div>
            <Row label="Position Size" value={fmtUsd(positionValue)} />
            {pnlSl !== null && <Row label="If SL hit" value={`${pnlSl >= 0 ? "+" : ""}${fmtUsd(pnlSl)}`} color={C.red} />}
            {pnlTp !== null && <Row label="If TP1 hit" value={`+${fmtUsd(pnlTp)}`} color={C.green} />}
            {liqPrice && (
              <Row
                label="Liquidation Price"
                value={fmtUsd(liqPrice)}
                color={C.amber}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button onClick={handleTake} style={{
              padding: "10px 0", borderRadius: C.radius, border: "none", cursor: "pointer",
              background: biasColor + "22", color: biasColor,
              fontFamily: C.mono, fontSize: 12, fontWeight: 700,
              borderBottom: `2px solid ${biasColor}`,
              transition: "all 0.15s",
            }}>
              ✓ TAKE
            </button>
            <button onClick={onWait} style={{
              padding: "10px 0", borderRadius: C.radius, border: "none", cursor: "pointer",
              background: C.amberDim, color: C.amber,
              fontFamily: C.mono, fontSize: 12, fontWeight: 700,
              borderBottom: `2px solid ${C.amber}`,
              transition: "all 0.15s",
            }}>
              ⏸ WAIT
            </button>
            <button onClick={onSkip} style={{
              padding: "10px 0", borderRadius: C.radius, border: "none", cursor: "pointer",
              background: C.bg, color: C.muted,
              fontFamily: C.mono, fontSize: 12, fontWeight: 600,
              borderBottom: `2px solid ${C.border}`,
              transition: "all 0.15s",
            }}>
              ✕ SKIP
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
