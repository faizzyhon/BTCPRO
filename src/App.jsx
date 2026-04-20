import { useState } from "react";
import { C, TIMEFRAMES } from "./constants.js";
import { useMarketData } from "./hooks/useMarketData.js";
import { useTrades } from "./hooks/useTrades.js";

import PriceHeader     from "./components/PriceHeader.jsx";
import Chart           from "./components/Chart.jsx";
import SignalPanel     from "./components/SignalPanel.jsx";
import PositionCalc    from "./components/PositionCalc.jsx";
import RiskPanel       from "./components/RiskPanel.jsx";
import TradeJournal    from "./components/TradeJournal.jsx";
import AIPanel         from "./components/AIPanel.jsx";
import NewsPanel       from "./components/NewsPanel.jsx";
import MacroPanel      from "./components/MacroPanel.jsx";
import AlertsPanel     from "./components/AlertsPanel.jsx";
import BooksPanel      from "./components/BooksPanel.jsx";
import SettingsPanel   from "./components/SettingsPanel.jsx";
import TradeConfirmModal from "./components/TradeConfirmModal.jsx";

// ─── Primitives ───────────────────────────────────────────────────────────────

const Card = ({ children, style }) => (
  <div style={{
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: C.radius2,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...style,
  }}>
    {children}
  </div>
);

const TabBar = ({ tabs, active, onChange, accent = C.cyan }) => (
  <div style={{
    display: "flex", gap: 0,
    borderBottom: `1px solid ${C.border}`, flexShrink: 0,
    background: C.panel, overflowX: "auto",
  }}>
    {tabs.map(({ key, label, icon }) => {
      const isActive = active === key;
      return (
        <button key={key} onClick={() => onChange(key)} style={{
          padding: "9px 13px", border: "none", cursor: "pointer",
          fontFamily: C.mono, fontSize: 10, fontWeight: 700,
          whiteSpace: "nowrap",
          background: "transparent",
          color: isActive ? C.ink : C.muted,
          borderBottom: isActive ? `2px solid ${accent}` : "2px solid transparent",
          transition: "all 0.12s",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
          {label}
        </button>
      );
    })}
  </div>
);

const LeftTabBar = ({ tab, onChange }) => (
  <div style={{
    display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
  }}>
    {[
      { key: "Signals",  label: "Signals"   },
      { key: "Position", label: "Position"  },
      { key: "Risk",     label: "Risk"      },
    ].map(({ key, label }) => (
      <button key={key} onClick={() => onChange(key)} style={{
        flex: 1, padding: "9px 4px", border: "none", cursor: "pointer",
        fontFamily: C.mono, fontSize: 10, fontWeight: 700,
        background: "transparent",
        color: tab === key ? C.ink : C.muted,
        borderBottom: tab === key ? `2px solid ${C.cyan}` : "2px solid transparent",
        transition: "all 0.12s",
      }}>{label}</button>
    ))}
  </div>
);

const RIGHT_TABS = [
  { key: "AI",       label: "AI",       icon: "🤖" },
  { key: "News",     label: "News",     icon: "📰" },
  { key: "Books",    label: "Books",    icon: "📚" },
  { key: "Macro",    label: "Macro",    icon: "🌍" },
  { key: "Alerts",   label: "Alerts",   icon: "🔔" },
  { key: "Settings", label: "Settings", icon: "⚙" },
];

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [timeframe, setTimeframe] = useState("15m");
  const [leftTab,   setLeftTab]   = useState("Signals");
  const [rightTab,  setRightTab]  = useState("AI");
  const [pendingAnalysis, setPendingAnalysis] = useState(null);

  const { ticker, funding, openInterest, candles, indicators, error, loading, wsStatus } = useMarketData(timeframe);
  const trades = useTrades();

  const handleTakeTrade    = (analysis) => setPendingAnalysis(analysis);
  const handleConfirmTrade = (params)   => { trades.openTrade(params); setPendingAnalysis(null); setLeftTab("Risk"); };
  const handleSkip         = ()         => setPendingAnalysis(null);
  const handleWait         = ()         => setPendingAnalysis(null);

  return (
    <div style={{
      height: "100vh", overflow: "hidden",
      background: C.bg, color: C.ink, fontFamily: C.sans,
      display: "flex", flexDirection: "column",
    }}>
      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.muted}; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.sub}; }
        input[type=range] { accent-color: ${C.cyan}; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* Trade Confirm Modal */}
      {pendingAnalysis && (
        <TradeConfirmModal
          analysis={pendingAnalysis}
          ticker={ticker}
          defaultLeverage={trades.leverage}
          defaultBalance={trades.balance}
          onTake={handleConfirmTrade}
          onSkip={handleSkip}
          onWait={handleWait}
        />
      )}

      {/* Header */}
      <PriceHeader
        ticker={ticker}
        funding={funding}
        openInterest={openInterest}
        wsStatus={wsStatus}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        timeframes={TIMEFRAMES}
      />

      {/* Error Banner */}
      {error && (
        <div style={{
          padding: "5px 16px", flexShrink: 0,
          background: C.amberDim, borderBottom: `1px solid ${C.amber}22`,
          fontSize: 10, fontFamily: C.mono, color: C.amber,
        }}>
          ⚠ {error} — using cached data
        </div>
      )}

      {/* Main Grid */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "260px 1fr 330px",
        gap: 6, padding: 6,
        overflow: "hidden", minHeight: 0,
      }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <Card>
          <LeftTabBar tab={leftTab} onChange={setLeftTab} />
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {leftTab === "Signals"  && <SignalPanel indicators={indicators} ticker={ticker} />}
            {leftTab === "Position" && (
              <PositionCalc
                ticker={ticker}
                indicators={indicators}
                stats={trades.stats}
                leverage={trades.leverage}
                balance={trades.balance}
                onOpenTrade={trades.openTrade}
              />
            )}
            {leftTab === "Risk" && (
              <RiskPanel
                stats={trades.stats}
                openTrades={trades.open}
                ticker={ticker}
                balance={trades.balance}
              />
            )}
          </div>
        </Card>

        {/* ── CENTER COLUMN ───────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "hidden", minHeight: 0 }}>
          {/* Chart */}
          <Card style={{ flex: "0 0 63%" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "6px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, fontWeight: 700 }}>
                BTC/USDT-PERP · {timeframe.toUpperCase()}
                <span style={{ color: C.border, margin: "0 6px" }}>|</span>
                <span style={{ color: C.sub }}>{candles.length} candles</span>
              </span>
              {loading && (
                <span style={{ fontSize: 9, fontFamily: C.mono, color: C.muted }}>updating…</span>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {loading && !candles.length ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 11, fontFamily: C.mono, color: C.muted }}>Loading chart…</div>
                </div>
              ) : (
                <Chart candles={candles} indicators={indicators} ticker={ticker} />
              )}
            </div>
          </Card>

          {/* Trade Journal */}
          <Card style={{ flex: 1 }}>
            <TradeJournal
              openTrades={trades.open}
              closedTrades={trades.closed}
              ticker={ticker}
              onClose={trades.closeTrade}
              onDelete={trades.deleteTrade}
              onEditClosed={trades.editClosedTrade}
              onDeleteClosed={trades.deleteClosedTrade}
              stats={trades.stats}
            />
          </Card>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
        <Card>
          <TabBar
            tabs={RIGHT_TABS}
            active={rightTab}
            onChange={setRightTab}
          />
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {rightTab === "AI"       && <AIPanel ticker={ticker} indicators={indicators} timeframe={timeframe} onTakeTrade={handleTakeTrade} />}
            {rightTab === "News"     && <NewsPanel />}
            {rightTab === "Books"    && <BooksPanel ticker={ticker} indicators={indicators} />}
            {rightTab === "Macro"    && <MacroPanel ticker={ticker} />}
            {rightTab === "Alerts"   && <AlertsPanel ticker={ticker} indicators={indicators} />}
            {rightTab === "Settings" && <SettingsPanel trades={trades} />}
          </div>
        </Card>
      </div>
    </div>
  );
}
