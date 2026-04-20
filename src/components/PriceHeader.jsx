import { C } from "../constants.js";
import { fmtUsd, fmtPct, fmtCompactVol, fmtNum } from "../utils/formatters.js";

const Divider = () => (
  <div style={{ width: 1, height: 28, background: C.border, flexShrink: 0 }} />
);

const Stat = ({ label, value, color, sub }) => (
  <div style={{ flexShrink: 0 }}>
    <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
      {label}
    </div>
    <div style={{ fontSize: 12, fontFamily: C.mono, color: color || C.ink, fontWeight: 600 }}>
      {value}
      {sub && <span style={{ fontSize: 9, color: C.muted, marginLeft: 3 }}>{sub}</span>}
    </div>
  </div>
);

const WsDot = ({ status }) => {
  const color = status === "connected" ? C.green : status === "reconnecting" ? C.amber : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0,
        boxShadow: status === "connected" ? `0 0 5px ${color}` : "none",
      }} />
      <span style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase" }}>
        {status === "connected" ? "LIVE" : status}
      </span>
    </div>
  );
};

function FundingPill({ funding }) {
  if (!funding) return null;
  const rate = funding.fundingRate;
  const color = rate >= 0 ? C.green : C.red;
  const next = funding.nextFundingTime;
  const msLeft = next - Date.now();
  const hLeft  = Math.floor(msLeft / 3_600_000);
  const mLeft  = Math.floor((msLeft % 3_600_000) / 60_000);
  const timeStr = msLeft > 0 ? `${hLeft}h${mLeft}m` : "--";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "3px 8px", borderRadius: C.radius,
      background: color + "12", border: `1px solid ${color}22`,
    }}>
      <div>
        <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", marginBottom: 1 }}>Funding</div>
        <div style={{ fontSize: 11, fontFamily: C.mono, color, fontWeight: 700 }}>
          {rate >= 0 ? "+" : ""}{fmtNum(rate, 4)}%
          <span style={{ fontSize: 9, color: C.muted, marginLeft: 4 }}>in {timeStr}</span>
        </div>
      </div>
    </div>
  );
}

export default function PriceHeader({ ticker, funding, openInterest, wsStatus, timeframe, onTimeframeChange, timeframes }) {
  const isUp = (ticker.change24h ?? 0) >= 0;
  const changeColor = isUp ? C.green : C.red;

  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "0 16px", height: 50,
      background: C.panel,
      borderBottom: `1px solid ${C.border}`,
      flexShrink: 0, overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: C.radius,
          background: "linear-gradient(135deg, #F7931A 0%, #FF5E00 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 900, color: "#fff",
        }}>₿</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, fontFamily: C.sans, color: C.ink, lineHeight: 1 }}>
            Market<span style={{ color: C.cyan }}>Pulse</span>
          </div>
          <div style={{ fontSize: 8, fontFamily: C.mono, color: C.muted, letterSpacing: "0.1em" }}>
            AI FUTURES
          </div>
        </div>
      </div>

      <Divider />

      {/* Pair + Price */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, fontWeight: 600 }}>BTC-PERP</span>
          <span style={{ fontSize: 22, fontFamily: C.mono, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {ticker.price ? fmtUsd(ticker.price, 0) : "Loading…"}
          </span>
          <span style={{
            fontSize: 12, fontFamily: C.mono, fontWeight: 700, color: changeColor,
            padding: "1px 6px", borderRadius: 4,
            background: changeColor + "15",
          }}>
            {fmtPct(ticker.change24h)}
          </span>
        </div>
      </div>

      <Divider />

      {/* Market stats */}
      <div style={{ display: "flex", gap: 20, flex: 1, overflow: "hidden", alignItems: "center" }}>
        <Stat label="24h High" value={fmtUsd(ticker.high24h, 0)} color={C.green} />
        <Stat label="24h Low"  value={fmtUsd(ticker.low24h,  0)} color={C.red}   />
        <Stat label="Volume"   value={fmtCompactVol(ticker.volume)} />
        {openInterest && (
          <Stat label="Open Interest" value={`${fmtNum(openInterest.openInterest / 1000, 1)}K BTC`} color={C.blue} />
        )}
        {funding && <FundingPill funding={funding} />}
      </div>

      {/* Timeframe tabs */}
      <div style={{
        display: "flex", gap: 2, flexShrink: 0,
        background: C.bg, borderRadius: C.radius,
        padding: "3px", border: `1px solid ${C.border}`,
      }}>
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(tf.value)}
            style={{
              padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer",
              fontFamily: C.mono, fontSize: 11, fontWeight: 700,
              background: timeframe === tf.value ? C.panel2 : "transparent",
              color: timeframe === tf.value ? C.cyan : C.muted,
              borderBottom: timeframe === tf.value ? `2px solid ${C.cyan}` : "2px solid transparent",
              transition: "all 0.12s",
            }}
          >{tf.label}</button>
        ))}
      </div>

      <Divider />
      <WsDot status={wsStatus} />
    </header>
  );
}
