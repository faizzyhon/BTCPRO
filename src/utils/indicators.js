export function calcSMA(closes, period) {
  if (closes.length < period) return closes.at(-1) ?? 0;
  const slice = closes.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

export function calcEMA(closes, period) {
  if (!closes.length) return 0;
  const k = 2 / (period + 1);
  return closes.reduce((ema, price, i) => (i === 0 ? price : price * k + ema * (1 - k)), closes[0]);
}

export function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const ag = gains / period, al = losses / period;
  if (al === 0) return 100;
  return 100 - 100 / (1 + ag / al);
}

export function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return { macd: 0, signal: 0, hist: 0 };
  const emaFast = closes.map((_, i) => i < fast - 1 ? null : calcEMA(closes.slice(0, i + 1).slice(-fast * 2), fast));
  const emaSlow = closes.map((_, i) => i < slow - 1 ? null : calcEMA(closes.slice(0, i + 1).slice(-slow * 2), slow));
  const macdLine = emaFast.map((f, i) => f != null && emaSlow[i] != null ? f - emaSlow[i] : null).filter(Boolean);
  const signalLine = calcEMA(macdLine.slice(-signal * 3), signal);
  const macdVal = macdLine.at(-1) ?? 0;
  return { macd: macdVal, signal: signalLine, hist: macdVal - signalLine };
}

export function calcBollinger(closes, period = 20, mult = 2) {
  if (closes.length < period) return { upper: 0, mid: 0, lower: 0, width: 0, pct: 50 };
  const slice = closes.slice(-period);
  const mid = slice.reduce((s, v) => s + v, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period;
  const dev = Math.sqrt(variance);
  const upper = mid + dev * mult;
  const lower = mid - dev * mult;
  const price = closes.at(-1);
  return {
    upper,
    mid,
    lower,
    width: mid ? ((dev * mult * 2) / mid) * 100 : 0,
    pct: upper !== lower ? ((price - lower) / (upper - lower)) * 100 : 50,
  };
}

export function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return 0;
  const recent = candles.slice(-period);
  const trs = recent.map((c, i) => {
    const prev = candles[candles.length - period + i - 1]?.close ?? c.close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  return trs.reduce((s, v) => s + v, 0) / period;
}

export function calcStochastic(candles, kPeriod = 14, dPeriod = 3) {
  if (candles.length < kPeriod) return { k: 50, d: 50 };
  const recent = candles.slice(-kPeriod);
  const highMax = Math.max(...recent.map((c) => c.high));
  const lowMin = Math.min(...recent.map((c) => c.low));
  const k = highMax !== lowMin
    ? ((candles.at(-1).close - lowMin) / (highMax - lowMin)) * 100
    : 50;
  const kValues = [];
  for (let i = kPeriod; i <= candles.length; i++) {
    const slice = candles.slice(i - kPeriod, i);
    const h = Math.max(...slice.map((c) => c.high));
    const l = Math.min(...slice.map((c) => c.low));
    kValues.push(h !== l ? ((slice.at(-1).close - l) / (h - l)) * 100 : 50);
  }
  const d = calcSMA(kValues.slice(-dPeriod), dPeriod);
  return { k, d };
}

export function calcVWAP(candles) {
  if (!candles.length) return 0;
  let totalVol = 0, totalTyp = 0;
  for (const c of candles) {
    const typ = (c.high + c.low + c.close) / 3;
    totalVol += c.volume;
    totalTyp += typ * c.volume;
  }
  return totalVol ? totalTyp / totalVol : 0;
}

export function calcEMASeries(closes, period) {
  const k = 2 / (period + 1);
  const out = new Array(closes.length).fill(null);
  let ema = closes[0];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { out[i] = closes[0]; continue; }
    ema = closes[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

export function calcBBSeries(closes, period = 20, mult = 2) {
  const upper = [], mid = [], lower = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(null); mid.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const m = slice.reduce((s, v) => s + v, 0) / period;
    const dev = Math.sqrt(slice.reduce((s, v) => s + (v - m) ** 2, 0) / period);
    upper.push(m + dev * mult);
    mid.push(m);
    lower.push(m - dev * mult);
  }
  return { upper, mid, lower };
}

export function buildIndicators(candles) {
  if (!candles.length) return {};
  const closes = candles.map((c) => c.close);
  const bb = calcBollinger(closes);
  const macd = calcMACD(closes);
  const stoch = calcStochastic(candles);
  return {
    rsi: calcRSI(closes),
    sma20: calcSMA(closes, 20),
    ema21: calcEMA(closes.slice(-90), 21),
    ema55: calcEMA(closes.slice(-130), 55),
    ema200: calcEMA(closes.slice(-400), 200),
    vwap: calcVWAP(candles),
    bb,
    macd,
    stoch,
    atr: calcATR(candles),
  };
}

export function calcKelly(winRate, avgWin, avgLoss) {
  if (!avgLoss || !avgWin) return 0;
  const b = avgWin / avgLoss;
  const p = winRate / 100;
  const kelly = (b * p - (1 - p)) / b;
  return Math.max(0, Math.min(kelly * 0.5, 0.25)); // half-Kelly capped at 25%
}

export function suggestSetup({ price, indicators, bias, confidence, riskUsd }) {
  const atr = indicators.atr || price * 0.004;
  const dir = bias === "SHORT" ? "SHORT" : "LONG";
  const buf = Math.max(0.05, Math.min((confidence - 50) / 100, 0.35));
  const entryMid = dir === "LONG" ? price - atr * 0.15 : price + atr * 0.15;
  const stop = dir === "LONG" ? entryMid - atr * 1.4 : entryMid + atr * 1.4;
  const risk = Math.abs(entryMid - stop);
  const tp1 = dir === "LONG" ? entryMid + risk * 1.5 : entryMid - risk * 1.5;
  const tp2 = dir === "LONG" ? entryMid + risk * 3.0 : entryMid - risk * 3.0;
  const sizeBtc = risk > 0 ? riskUsd / risk : 0;
  return { dir, entryMid, stop, tp1, tp2, atr, sizeBtc, rr: 1.5 };
}
