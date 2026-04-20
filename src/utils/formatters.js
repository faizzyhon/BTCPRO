export function fmtUsd(v, digits = 0) {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    notation: Math.abs(v) >= 1_000_000 ? "compact" : "standard",
  }).format(v);
}

export function fmtPct(v, digits = 2) {
  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

export function fmtNum(v, digits = 2) {
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(v);
}

export function fmtBtc(v, digits = 4) {
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)} BTC`;
}

export function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(ms) {
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function fmtDateTime(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fmtCompactVol(v) {
  if (!Number.isFinite(v)) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return fmtUsd(v);
}

export function fmtAge(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
