import { useState } from "react";
import { C, STORAGE_KEYS, DEFAULT_MODEL } from "../constants.js";
import { readStore, writeStore } from "../utils/storage.js";
import { fmtUsd } from "../utils/formatters.js";

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{
      fontSize: 10, fontFamily: C.mono, color: C.muted,
      textTransform: "uppercase", letterSpacing: "0.08em",
      marginBottom: 10, paddingBottom: 5,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {title}
    </div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, display: "block", marginBottom: 4 }}>
      {label}
    </label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, prefix, type = "text", placeholder }) => (
  <div style={{ position: "relative" }}>
    {prefix && (
      <span style={{
        position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
        fontSize: 11, fontFamily: C.mono, color: C.muted,
      }}>{prefix}</span>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: prefix ? "7px 8px 7px 20px" : "7px 10px",
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: C.radius, color: C.ink,
        fontFamily: C.mono, fontSize: 12, outline: "none",
      }}
    />
  </div>
);

const Saved = () => (
  <span style={{
    fontSize: 10, fontFamily: C.mono, color: C.green,
    marginLeft: 8, animation: "fadeout 2s forwards",
  }}>saved ✓</span>
);

export default function SettingsPanel({ trades }) {
  const { balance, leverage, defaultRiskPct, setBalance, setLeverage, setDefaultRiskPct } = trades;

  const [model, setModelState] = useState(() => readStore(STORAGE_KEYS.model, DEFAULT_MODEL));
  const [ollamaUrl, setOllamaUrlState] = useState(() => readStore(STORAGE_KEYS.ollamaUrl, "http://localhost:11434"));
  const [balInput, setBalInput] = useState(String(balance));
  const [levInput, setLevInput] = useState(String(leverage));
  const [riskInput, setRiskInput] = useState(String(defaultRiskPct));
  const [saved, setSaved] = useState({});

  const flash = (key) => {
    setSaved((p) => ({ ...p, [key]: true }));
    setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2000);
  };

  const saveBalance = () => {
    const v = +balInput;
    if (v > 0) { setBalance(v); flash("balance"); }
  };

  const saveLeverage = () => {
    const v = Math.max(1, Math.min(200, +levInput));
    setLeverage(v); setLevInput(String(v)); flash("leverage");
  };

  const saveRisk = () => {
    const v = Math.max(0.1, Math.min(10, +riskInput));
    setDefaultRiskPct(v); setRiskInput(String(v)); flash("risk");
  };

  const saveModel = (val) => {
    setModelState(val);
    writeStore(STORAGE_KEYS.model, val);
    flash("model");
  };

  const saveOllamaUrl = (val) => {
    setOllamaUrlState(val);
    writeStore(STORAGE_KEYS.ollamaUrl, val);
    flash("ollamaUrl");
  };

  const lev = Math.max(1, Math.min(200, +levInput || 1));
  const liqExLong = 94000 * (1 - 1 / lev);
  const liqExShort = 94000 * (1 + 1 / lev);

  return (
    <div style={{ padding: 14, overflowY: "auto", height: "100%" }}>
      <Section title="Account">
        <Field label={`Balance ${saved.balance ? "" : ""}`}>
          <div style={{ display: "flex", gap: 6 }}>
            <TextInput value={balInput} onChange={setBalInput} prefix="$" type="number" />
            <button onClick={saveBalance} style={btnStyle(C.cyan)}>Save{saved.balance && <Saved />}</button>
          </div>
          <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, marginTop: 4 }}>
            Current: {fmtUsd(balance)}
          </div>
        </Field>

        <Field label="Default Risk %">
          <div style={{ display: "flex", gap: 6 }}>
            <TextInput value={riskInput} onChange={setRiskInput} type="number" />
            <button onClick={saveRisk} style={btnStyle(C.cyan)}>Save</button>
          </div>
          {saved.risk && <Saved />}
          <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, marginTop: 4 }}>
            Risk per trade: {fmtUsd((balance * +riskInput) / 100)}
          </div>
        </Field>
      </Section>

      <Section title="Leverage">
        <Field label={`Default Leverage: ${lev}×`}>
          <input
            type="range" min="1" max="100" step="1"
            value={levInput}
            onChange={(e) => setLevInput(e.target.value)}
            style={{ width: "100%", marginBottom: 6 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: C.mono, color: C.muted, marginBottom: 8 }}>
            <span>1× (no leverage)</span>
            <span style={{ color: lev > 20 ? C.red : lev > 10 ? C.amber : C.green }}>{lev}×</span>
            <span>100×</span>
          </div>
          <button onClick={saveLeverage} style={{ ...btnStyle(C.cyan), width: "100%" }}>
            Apply {lev}× Default{saved.leverage && <Saved />}
          </button>
        </Field>

        <div style={{
          padding: "10px 12px", borderRadius: C.radius,
          background: lev > 20 ? C.redDim : lev > 10 ? C.amberDim : C.greenDim,
          border: `1px solid ${lev > 20 ? C.red : lev > 10 ? C.amber : C.green}33`,
          marginTop: 6,
        }}>
          <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, marginBottom: 6 }}>
            Liquidation at {lev}× (example: BTC $94,000)
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontFamily: C.mono, color: C.sub }}>LONG liq:</span>
            <span style={{ fontSize: 11, fontFamily: C.mono, color: C.red, fontWeight: 600 }}>{fmtUsd(liqExLong, 0)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontFamily: C.mono, color: C.sub }}>SHORT liq:</span>
            <span style={{ fontSize: 11, fontFamily: C.mono, color: C.red, fontWeight: 600 }}>{fmtUsd(liqExShort, 0)}</span>
          </div>
          {lev > 20 && (
            <div style={{ fontSize: 10, fontFamily: C.mono, color: C.red, marginTop: 6 }}>
              ⚠ High leverage — small moves = liquidation. Hull (Risk Management): leverage {lev}× = liquidation at {(100 / lev).toFixed(1)}% move.
            </div>
          )}
        </div>
      </Section>

      <Section title="AI / Ollama">
        <Field label="Ollama Model">
          <TextInput value={model} onChange={saveModel} placeholder="e.g. lfm2.5-thinking, llama3.2, gemma3" />
          {saved.model && <Saved />}
        </Field>
        <Field label="Ollama URL">
          <TextInput value={ollamaUrl} onChange={saveOllamaUrl} placeholder="http://localhost:11434" />
          {saved.ollamaUrl && <Saved />}
          <div style={{ fontSize: 10, fontFamily: C.mono, color: C.muted, marginTop: 4 }}>
            Run: <code style={{ color: C.cyan }}>ollama serve</code> to start local AI.
          </div>
        </Field>
      </Section>

      <Section title="Books Server (Port 5001)">
        <div style={{ fontSize: 11, fontFamily: C.mono, color: C.sub, marginBottom: 8 }}>
          Run the books knowledge server to enable probability analysis and AI context injection.
        </div>
        <div style={{
          padding: "8px 10px", background: C.bg,
          borderRadius: C.radius, border: `1px solid ${C.border}`,
          fontFamily: C.mono, fontSize: 11, color: C.cyan, marginBottom: 8,
        }}>
          python books_server.py
        </div>
        <BooksServerStatus />
      </Section>
    </div>
  );
}

function BooksServerStatus() {
  const [status, setStatus] = useState(null);

  const check = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5001/health");
      if (res.ok) setStatus("online");
      else setStatus("error");
    } catch {
      setStatus("offline");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={check} style={btnStyle(C.cyan)}>Check Status</button>
      {status && (
        <span style={{
          fontSize: 11, fontFamily: C.mono,
          color: status === "online" ? C.green : C.red,
        }}>
          {status === "online" ? "● Online" : status === "offline" ? "○ Offline" : "○ Error"}
        </span>
      )}
    </div>
  );
}

function btnStyle(color) {
  return {
    padding: "6px 14px", borderRadius: C.radius, border: "none", cursor: "pointer",
    background: color + "18", color,
    fontFamily: C.mono, fontSize: 11, fontWeight: 700,
    borderBottom: `2px solid ${color}44`,
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}
