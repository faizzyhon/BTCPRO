import { useState } from "react";
import { C } from "../constants.js";
import { fmtUsd, fmtBtc, fmtAge, fmtPct, fmtNum } from "../utils/formatters.js";

const TabBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "5px 12px", border: "none", cursor: "pointer", borderRadius: 4,
    fontFamily: C.mono, fontSize: 11, fontWeight: 600,
    background: active ? C.panel2 : "transparent",
    color: active ? C.ink : C.muted,
    transition: "all 0.15s",
  }}>
    {children}
  </button>
);

function OpenTradeRow({ trade, price, onClose, onDelete }) {
  const [showClose, setShowClose] = useState(false);
  const [exitPrice, setExitPrice] = useState(price?.toFixed(0) || "");

  const mult = trade.direction === "SHORT" ? -1 : 1;
  const lev = trade.leverage || 1;
  const amt = trade.amountUsd || trade.entry * trade.sizeBtc;
  const pctMove = price ? (price - trade.entry) / trade.entry * mult : 0;
  const pnl = pctMove * lev * amt;
  const pnlPct = pctMove * lev * 100;
  const dirColor = trade.direction === "LONG" ? C.green : C.red;

  const liqPct = lev > 1 ? ((1 / lev) * 100).toFixed(1) : null;

  return (
    <div style={{
      padding: "8px 10px", borderRadius: C.radius, marginBottom: 6,
      background: C.bg, border: `1px solid ${(price && pnl >= 0) ? C.green + "22" : C.red + "22"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: C.mono, color: dirColor, fontWeight: 700 }}>
            {trade.direction === "LONG" ? "▲" : "▼"} {trade.direction}
          </span>
          {lev > 1 && (
            <span style={{ fontSize: 9, fontFamily: C.mono, color: C.amber, background: C.amberDim, padding: "1px 5px", borderRadius: 3 }}>
              {lev}×
            </span>
          )}
          <span style={{ fontSize: 10, fontFamily: C.mono, color: C.muted }}>
            {fmtAge(trade.openedAt)}
          </span>
        </div>
        <span style={{ fontSize: 13, fontFamily: C.mono, fontWeight: 700, color: (price && pnl >= 0) ? C.green : C.red }}>
          {price ? `${pnl >= 0 ? "+" : ""}${fmtUsd(pnl)} (${fmtPct(pnlPct)})` : "—"}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 10, fontFamily: C.mono, color: C.sub, marginBottom: 4 }}>
        <span>Entry: <span style={{ color: C.ink }}>{fmtUsd(trade.entry)}</span></span>
        <span>SL: <span style={{ color: C.red }}>{fmtUsd(trade.stop)}</span></span>
        <span>TP: <span style={{ color: C.green }}>{fmtUsd(trade.tp1)}</span></span>
        <span>Amt: <span style={{ color: C.ink }}>{fmtUsd(trade.amountUsd)}</span></span>
      </div>

      {trade.liqPrice && (
        <div style={{ fontSize: 10, fontFamily: C.mono, color: C.amber, marginBottom: 6 }}>
          Liq: {fmtUsd(trade.liqPrice, 0)} ({liqPct}% move)
        </div>
      )}

      {showClose ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            placeholder="Exit price"
            style={{
              flex: 1, padding: "5px 8px", background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: C.radius, color: C.ink, fontFamily: C.mono, fontSize: 11, outline: "none",
            }}
          />
          <button onClick={() => { onClose(trade.id, +exitPrice); setShowClose(false); }} style={actBtn(C.green)}>Close</button>
          <button onClick={() => setShowClose(false)} style={actBtn(C.muted)}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowClose(true)} style={actBtn(C.green)}>Close Trade</button>
          <button onClick={() => onDelete(trade.id)} style={actBtn(C.red)}>Delete</button>
        </div>
      )}
    </div>
  );
}

function ClosedTradeRow({ trade, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    entry: String(trade.entry || ""),
    exitPrice: String(trade.exitPrice || ""),
    amountUsd: String(trade.amountUsd || ""),
    leverage: String(trade.leverage || 1),
    notes: trade.notes || "",
  });
  const [confirmDel, setConfirmDel] = useState(false);

  const dirColor = trade.direction === "LONG" ? C.green : C.red;
  const pnl = trade.pnl ?? 0;
  const lev = trade.leverage || 1;

  const saveEdit = () => {
    onEdit(trade.id, {
      entry: +fields.entry,
      exitPrice: +fields.exitPrice,
      amountUsd: +fields.amountUsd,
      leverage: +fields.leverage,
      notes: fields.notes,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{
        padding: "10px 12px", borderRadius: C.radius, marginBottom: 6,
        background: C.bg, border: `1px solid ${C.cyan}44`,
      }}>
        <div style={{ fontSize: 10, fontFamily: C.mono, color: C.cyan, marginBottom: 8, fontWeight: 700 }}>
          Edit Trade — {trade.direction}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {[["entry", "Entry Price"], ["exitPrice", "Exit Price"], ["amountUsd", "Amount USD"], ["leverage", "Leverage"]].map(([key, label]) => (
            <div key={key}>
              <label style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, display: "block", marginBottom: 3 }}>{label}</label>
              <input
                type="number"
                value={fields[key]}
                onChange={(e) => setFields((p) => ({ ...p, [key]: e.target.value }))}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "5px 7px", background: C.panel, border: `1px solid ${C.border}`,
                  borderRadius: C.radius, color: C.ink, fontFamily: C.mono, fontSize: 11, outline: "none",
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, display: "block", marginBottom: 3 }}>Notes</label>
          <input
            value={fields.notes}
            onChange={(e) => setFields((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Optional notes..."
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "5px 7px", background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: C.radius, color: C.sub, fontFamily: C.mono, fontSize: 11, outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={saveEdit} style={actBtn(C.green)}>Save</button>
          <button onClick={() => setEditing(false)} style={actBtn(C.muted)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: "6px 10px", borderRadius: C.radius, marginBottom: 4,
      background: C.bg, border: `1px solid ${pnl >= 0 ? C.green + "22" : C.red + "22"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontFamily: C.mono, color: dirColor, fontWeight: 700 }}>
            {trade.direction === "LONG" ? "▲" : "▼"} {trade.direction}
          </span>
          {lev > 1 && (
            <span style={{ fontSize: 9, fontFamily: C.mono, color: C.amber, background: C.amberDim, padding: "1px 5px", borderRadius: 3 }}>
              {lev}×
            </span>
          )}
          <span style={{ fontSize: 9, fontFamily: C.mono, color: C.muted }}>{fmtAge(trade.closedAt)}</span>
        </div>
        <span style={{ fontSize: 12, fontFamily: C.mono, fontWeight: 700, color: pnl >= 0 ? C.green : C.red }}>
          {pnl >= 0 ? "+" : ""}{fmtUsd(pnl)}
        </span>
      </div>

      <div style={{ fontSize: 10, fontFamily: C.mono, color: C.sub, marginBottom: 4 }}>
        {fmtUsd(trade.entry)} → {fmtUsd(trade.exitPrice)}
        {trade.amountUsd && <span style={{ marginLeft: 8, color: C.muted }}>Amt: {fmtUsd(trade.amountUsd)}</span>}
      </div>

      {trade.notes && (
        <div style={{ fontSize: 10, fontFamily: C.sans, color: C.muted, marginBottom: 4, fontStyle: "italic" }}>
          "{trade.notes}"
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setEditing(true)} style={actBtn(C.cyan)}>Edit</button>
        {confirmDel ? (
          <>
            <button onClick={() => onDelete(trade.id)} style={actBtn(C.red)}>Confirm Delete</button>
            <button onClick={() => setConfirmDel(false)} style={actBtn(C.muted)}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={actBtn(C.muted)}>Remove</button>
        )}
      </div>
    </div>
  );
}

function StatsRow({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 13, fontFamily: C.mono, fontWeight: 700, color: color || C.ink }}>{value}</div>
      <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

export default function TradeJournal({ openTrades, closedTrades, ticker, onClose, onDelete, onEditClosed, onDeleteClosed, stats }) {
  const [tab, setTab] = useState("open");
  const price = ticker?.price;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 4, padding: "6px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, alignItems: "center" }}>
        <TabBtn active={tab === "open"} onClick={() => setTab("open")}>
          Open ({openTrades.length})
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>
          History ({closedTrades.length})
        </TabBtn>
        {tab === "history" && stats?.count > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
            <StatsRow label="Win Rate" value={`${fmtNum(stats.winRate, 0)}%`} color={stats.winRate >= 50 ? C.green : C.red} />
            <StatsRow label="Total P&L" value={`${stats.totalPnl >= 0 ? "+" : ""}${fmtUsd(stats.totalPnl)}`} color={stats.totalPnl >= 0 ? C.green : C.red} />
            <StatsRow label="PF" value={fmtNum(stats.profitFactor, 2)} color={stats.profitFactor >= 1.5 ? C.green : C.amber} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {tab === "open" ? (
          openTrades.length ? (
            openTrades.map((t) => (
              <OpenTradeRow key={t.id} trade={t} price={price} onClose={onClose} onDelete={onDelete} />
            ))
          ) : (
            <div style={{ textAlign: "center", padding: 24, color: C.muted, fontFamily: C.mono, fontSize: 11 }}>
              No open trades. Use Position Calc or confirm an AI signal.
            </div>
          )
        ) : (
          closedTrades.length ? (
            closedTrades.map((t) => (
              <ClosedTradeRow
                key={t.id + t.closedAt}
                trade={t}
                onEdit={onEditClosed}
                onDelete={onDeleteClosed}
              />
            ))
          ) : (
            <div style={{ textAlign: "center", padding: 24, color: C.muted, fontFamily: C.mono, fontSize: 11 }}>
              No closed trades yet.
            </div>
          )
        )}
      </div>
    </div>
  );
}

function actBtn(color) {
  return {
    padding: "4px 10px", borderRadius: C.radius, border: "none", cursor: "pointer",
    background: color + "18", color,
    fontFamily: C.mono, fontSize: 10, fontWeight: 700,
  };
}
