import { useCallback, useEffect, useRef, useState } from "react";
import { C, STORAGE_KEYS } from "../constants.js";
import { readStore, writeStore } from "../utils/storage.js";
import { fmtUsd } from "../utils/formatters.js";

function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendNotif(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "" });
  }
}

const TYPES = [
  { value: "price_above", label: "Price ≥" },
  { value: "price_below", label: "Price ≤" },
  { value: "rsi_above", label: "RSI ≥" },
  { value: "rsi_below", label: "RSI ≤" },
  { value: "pct_move", label: "±% Move" },
];

function checkAlert(alert, ticker, indicators) {
  const price = ticker?.price;
  const rsi = indicators?.rsi;
  switch (alert.type) {
    case "price_above": return price >= +alert.value;
    case "price_below": return price <= +alert.value;
    case "rsi_above": return rsi >= +alert.value;
    case "rsi_below": return rsi <= +alert.value;
    case "pct_move": return Math.abs(ticker?.change24h || 0) >= +alert.value;
    default: return false;
  }
}

export default function AlertsPanel({ ticker, indicators }) {
  const [alerts, setAlerts] = useState(() => readStore(STORAGE_KEYS.alerts, []));
  const [type, setType] = useState("price_above");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const triggeredRef = useRef(new Set());

  useEffect(() => { requestNotifPermission(); }, []);

  // Check alerts
  useEffect(() => {
    alerts.forEach((alert) => {
      if (alert.triggered || triggeredRef.current.has(alert.id)) return;
      if (checkAlert(alert, ticker, indicators)) {
        triggeredRef.current.add(alert.id);
        sendNotif("BTC Alert", `${alert.label}: ${alert.value}${alert.note ? " — " + alert.note : ""}`);
        setAlerts((prev) => {
          const next = prev.map((a) => a.id === alert.id ? { ...a, triggered: true, triggeredAt: new Date().toISOString() } : a);
          writeStore(STORAGE_KEYS.alerts, next);
          return next;
        });
      }
    });
  }, [ticker, indicators, alerts]);

  const addAlert = useCallback(() => {
    if (!value) return;
    const label = TYPES.find((t) => t.value === type)?.label || type;
    const alert = {
      id: `alert-${Date.now()}`,
      type, value, note, label,
      triggered: false,
      createdAt: new Date().toISOString(),
    };
    const next = [...alerts, alert];
    setAlerts(next);
    writeStore(STORAGE_KEYS.alerts, next);
    setValue("");
    setNote("");
  }, [alerts, type, value, note]);

  const removeAlert = useCallback((id) => {
    const next = alerts.filter((a) => a.id !== id);
    setAlerts(next);
    writeStore(STORAGE_KEYS.alerts, next);
    triggeredRef.current.delete(id);
  }, [alerts]);

  const resetAlert = useCallback((id) => {
    triggeredRef.current.delete(id);
    const next = alerts.map((a) => a.id === id ? { ...a, triggered: false, triggeredAt: null } : a);
    setAlerts(next);
    writeStore(STORAGE_KEYS.alerts, next);
  }, [alerts]);

  const active = alerts.filter((a) => !a.triggered);
  const fired = alerts.filter((a) => a.triggered);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Alerts ({active.length} active)
      </div>

      {/* Create alert */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px", borderRadius: C.radius, background: C.bg, border: `1px solid ${C.border}`, marginBottom: 10 }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            padding: "5px 8px", background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: C.radius, color: C.ink, fontFamily: C.mono, fontSize: 11, outline: "none",
          }}
        >
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="number"
          placeholder={type.includes("price") ? fmtUsd(ticker?.price || 0, 0) : type.includes("rsi") ? "RSI value" : "% threshold"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            padding: "5px 8px", background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: C.radius, color: C.ink, fontFamily: C.mono, fontSize: 11, outline: "none",
          }}
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            padding: "5px 8px", background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: C.radius, color: C.sub, fontFamily: C.mono, fontSize: 11, outline: "none",
          }}
        />
        <button onClick={addAlert} style={{
          padding: "6px 0", borderRadius: C.radius, border: "none", cursor: "pointer",
          background: C.panel2, color: C.cyan, fontFamily: C.mono, fontSize: 11, fontWeight: 700,
          borderBottom: `2px solid ${C.cyan}`,
        }}>
          + Set Alert
        </button>
      </div>

      {/* Active alerts */}
      {active.map((alert) => (
        <div key={alert.id} style={{
          padding: "6px 10px", borderRadius: C.radius, marginBottom: 4,
          background: C.bg, border: `1px solid ${C.cyan}33`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: C.mono, color: C.ink }}>
              {alert.label} {type.includes("price") ? fmtUsd(+alert.value, 0) : alert.value}
            </div>
            {alert.note && <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted }}>{alert.note}</div>}
          </div>
          <button onClick={() => removeAlert(alert.id)} style={{
            padding: "2px 8px", border: "none", cursor: "pointer", borderRadius: 3,
            background: "transparent", color: C.muted, fontFamily: C.mono, fontSize: 11,
          }}>✕</button>
        </div>
      ))}

      {/* Fired alerts */}
      {fired.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, marginBottom: 4 }}>FIRED</div>
          {fired.map((alert) => (
            <div key={alert.id} style={{
              padding: "6px 10px", borderRadius: C.radius, marginBottom: 4,
              background: C.greenDim, border: `1px solid ${C.green}33`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              opacity: 0.7,
            }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: C.mono, color: C.green }}>
                  ✓ {alert.label} {alert.value}
                </div>
                {alert.note && <div style={{ fontSize: 9, fontFamily: C.mono, color: C.muted }}>{alert.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => resetAlert(alert.id)} style={{
                  padding: "2px 6px", border: "none", cursor: "pointer", borderRadius: 3,
                  background: C.bg, color: C.sub, fontFamily: C.mono, fontSize: 9,
                }}>↺</button>
                <button onClick={() => removeAlert(alert.id)} style={{
                  padding: "2px 6px", border: "none", cursor: "pointer", borderRadius: 3,
                  background: "transparent", color: C.muted, fontFamily: C.mono, fontSize: 11,
                }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && (
        <div style={{ textAlign: "center", padding: 16, color: C.muted, fontFamily: C.mono, fontSize: 10 }}>
          No alerts set. Browser notifications required.
        </div>
      )}
    </div>
  );
}
