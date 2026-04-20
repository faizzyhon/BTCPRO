import { C } from "../constants.js";
import { fmtUsd, fmtPct, fmtNum, clamp } from "../utils/formatters.js";
import { calcKelly } from "../utils/indicators.js";

const Meter = ({ value, max, color, label, sublabel }) => {
  const pct = clamp(Math.abs(value) / max * 100, 0, 100);
  const danger = pct >= 80;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontFamily: C.mono, color: C.sub }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: C.mono, color: danger ? C.red : color || C.ink, fontWeight: 600 }}>
          {sublabel}
        </span>
      </div>
      <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: danger ? C.red : color || C.blue,
          transition: "width 0.4s ease",
          boxShadow: danger ? `0 0 8px ${C.red}` : "none",
        }} />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, note }) => (
  <div style={{
    flex: 1, padding: "8px 10px", background: C.bg, borderRadius: C.radius,
    border: `1px solid ${C.border}`, textAlign: "center",
  }}>
    <div style={{ fontSize: 15, fontFamily: C.mono, fontWeight: 700, color: color || C.ink }}>{value}</div>
    <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, marginTop: 2, textTransform: "uppercase" }}>{label}</div>
    {note && <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{note}</div>}
  </div>
);

export default function RiskPanel({ stats, openTrades, ticker, balance }) {
  const price = ticker?.price || 0;

  // Calculate open P&L
  const openPnl = openTrades.reduce((sum, t) => {
    if (!price) return sum;
    const mult = t.direction === "SHORT" ? -1 : 1;
    return sum + (price - t.entry) * mult * t.sizeBtc;
  }, 0);

  const totalExposure = openTrades.reduce((sum, t) => sum + t.sizeBtc * (t.entry || price), 0);
  const exposurePct = balance ? (totalExposure / balance) * 100 : 0;

  const dailyLossLimit = balance * 0.03; // 3% daily loss limit
  const weeklyLossLimit = balance * 0.06;
  const maxDrawdown = balance * 0.15;

  const kelly = calcKelly(stats.winRate, stats.avgWin, stats.avgLoss);
  const kellyPct = kelly * 100;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Risk Dashboard
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <StatCard
          label="Win Rate"
          value={stats.count ? fmtPct(stats.winRate, 0) : "—"}
          color={stats.winRate >= 50 ? C.green : C.red}
        />
        <StatCard
          label="Profit Factor"
          value={stats.count ? fmtNum(stats.profitFactor) : "—"}
          color={stats.profitFactor >= 1.5 ? C.green : stats.profitFactor >= 1 ? C.amber : C.red}
        />
        <StatCard
          label="Total PnL"
          value={stats.count ? fmtUsd(stats.totalPnl) : "—"}
          color={stats.totalPnl >= 0 ? C.green : C.red}
        />
      </div>

      {/* Open P&L */}
      {openTrades.length > 0 && (
        <div style={{
          padding: "8px 12px", borderRadius: C.radius, marginBottom: 10,
          background: openPnl >= 0 ? C.greenDim : C.redDim,
          border: `1px solid ${openPnl >= 0 ? C.green : C.red}22`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontFamily: C.mono, color: C.sub }}>Open P&L ({openTrades.length} trades)</span>
            <span style={{ fontSize: 13, fontFamily: C.mono, fontWeight: 700, color: openPnl >= 0 ? C.green : C.red }}>
              {fmtUsd(openPnl)}
            </span>
          </div>
        </div>
      )}

      {/* Risk Meters */}
      <Meter
        label="Exposure / Balance"
        sublabel={`${fmtPct(exposurePct, 1)} — ${fmtUsd(totalExposure, 0)}`}
        value={exposurePct}
        max={100}
        color={C.amber}
      />
      <Meter
        label="Daily Loss Limit (3%)"
        sublabel={`${fmtUsd(Math.abs(Math.min(openPnl, 0)))} / ${fmtUsd(dailyLossLimit)}`}
        value={Math.abs(Math.min(openPnl, 0))}
        max={dailyLossLimit}
        color={C.blue}
      />
      <Meter
        label="Weekly Loss Limit (6%)"
        sublabel={`Limit: ${fmtUsd(weeklyLossLimit)}`}
        value={Math.abs(Math.min(stats.totalPnl, 0))}
        max={weeklyLossLimit}
        color={C.purple}
      />

      {/* Kelly */}
      <div style={{
        padding: "8px 10px", borderRadius: C.radius, background: C.bg,
        border: `1px solid ${C.border}`, marginTop: 8,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ fontSize: 10, fontFamily: C.mono, color: C.sub }}>½-Kelly Criterion</span>
          <span style={{ fontSize: 12, fontFamily: C.mono, color: C.cyan, fontWeight: 600 }}>
            {fmtPct(kellyPct, 1)} / trade
          </span>
        </div>
        <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted }}>
          Optimal: {fmtUsd(balance * kelly)} per trade based on {stats.count} trades
        </div>
      </div>

      {/* Rules */}
      <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: C.radius, background: C.amberDim, border: `1px solid ${C.amber}22` }}>
        <div style={{ fontSize: 10, fontFamily: C.mono, color: C.amber, fontWeight: 700, marginBottom: 4 }}>RULES</div>
        {[
          "Max 1-2% risk per trade",
          "Daily loss limit: 3% of balance",
          "Max 5 concurrent positions",
          "Min R:R = 1.5 before entry",
          "Cut losses. Never move SL against trade.",
        ].map((rule, i) => (
          <div key={i} style={{ fontSize: 10, fontFamily: C.mono, color: C.sub, paddingLeft: 8, marginBottom: 2 }}>
            · {rule}
          </div>
        ))}
      </div>
    </div>
  );
}
