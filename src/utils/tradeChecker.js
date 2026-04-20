/**
 * Reconstruct trade outcome from Binance klines when app was closed.
 * Fetches 1m candles from trade open time → now, walks them to find first SL or TP hit.
 */

export async function checkTradeOutcomeFromHistory(trade) {
  const { entry, stop, tp1, direction, openedAt, leverage = 1, amountUsd = 0 } = trade;
  if (!entry || !stop) return null;

  const openTime = new Date(openedAt).getTime();
  const now = Date.now();
  if (now - openTime < 60_000) return null; // too recent

  // Fetch 1m candles in chunks (max 1000 per request = ~16.6 hours)
  const allCandles = [];
  let startTime = openTime;
  const limit = 1000;

  while (startTime < now) {
    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&startTime=${startTime}&limit=${limit}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.length) break;
      for (const k of data) {
        allCandles.push({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4] });
      }
      const last = data[data.length - 1];
      startTime = last[6] + 1; // closeTime + 1ms
      if (data.length < limit) break;
    } catch {
      break;
    }
  }

  if (!allCandles.length) return null;

  const isLong = direction === "LONG";

  for (const candle of allCandles) {
    if (isLong) {
      // Check SL first (pessimistic — assume low hits before high within same candle)
      if (stop && candle.low <= stop) {
        return buildResult(trade, "SL", stop, candle.time, leverage, amountUsd, entry, direction);
      }
      if (tp1 && candle.high >= tp1) {
        return buildResult(trade, "TP1", tp1, candle.time, leverage, amountUsd, entry, direction);
      }
    } else {
      // SHORT: high hits SL, low hits TP
      if (stop && candle.high >= stop) {
        return buildResult(trade, "SL", stop, candle.time, leverage, amountUsd, entry, direction);
      }
      if (tp1 && candle.low <= tp1) {
        return buildResult(trade, "TP1", tp1, candle.time, leverage, amountUsd, entry, direction);
      }
    }
  }

  return null; // still open
}

function buildResult(trade, outcome, exitPrice, exitTimeMs, leverage, amountUsd, entry, direction) {
  const mult = direction === "LONG" ? 1 : -1;
  const pctMove = (exitPrice - entry) / entry * mult;
  const pnl = pctMove * leverage * amountUsd;
  return {
    outcome,
    exitPrice,
    exitTime: new Date(exitTimeMs).toISOString(),
    pnl,
    isWin: outcome === "TP1",
  };
}

/**
 * Suggest leverage based on market conditions (books-informed).
 * Hull: liq = entry*(1-1/lev) → min liq dist should be > 2×ATR
 * Tharp: 1-2% account risk max
 * Recommendation: ATR-based, capped by news + confidence
 */
export function suggestLeverage({ price, atr, rsi, confidence = 50, newsImpact = "LOW", bb }) {
  if (!price || !atr) return 5;

  const atrPct = atr / price * 100; // ATR as % of price

  // Base: liq must be at least 2×ATR away → lev ≤ 1/(2×atrPct/100)
  const maxByAtr = Math.floor(1 / (atrPct * 2 / 100));

  // Confidence adjustment
  const confMult = confidence >= 75 ? 1.1 : confidence >= 60 ? 1.0 : confidence >= 45 ? 0.8 : 0.6;

  // News risk adjustment
  const newsMultMap = { HIGH: 0.6, MED: 0.8, LOW: 1.0 };
  const newsMult = newsMultMap[newsImpact] ?? 1.0;

  // BB squeeze = low volatility = can handle slightly more lev
  const bbMult = bb?.width < 2 ? 1.1 : bb?.width > 5 ? 0.8 : 1.0;

  const suggested = Math.round(maxByAtr * confMult * newsMult * bbMult);
  return Math.max(1, Math.min(50, suggested));
}

export function suggestEntrySlTp({ price, atr, direction, rsi, ema21, ema55, vwap, bb }) {
  if (!price || !atr) return null;
  const isLong = direction === "LONG";
  const mult   = isLong ? 1 : -1;

  // Entry: near current price, slightly better than market
  const entryOffset = atr * 0.1 * -mult; // small pullback
  const entry = price + entryOffset;

  // Stop: 1.5× ATR from entry
  const stopDist = atr * 1.5;
  const stop = entry - stopDist * mult;

  // TP1: 2.5× ATR (1:1.67 R:R minimum)
  const tp1 = entry + atr * 2.5 * mult;

  // TP2: 4× ATR
  const tp2 = entry + atr * 4.0 * mult;

  // Nearest key level for SL refinement
  const levels = [ema21, ema55, vwap, bb?.lower, bb?.upper].filter(Boolean);
  let refinedStop = stop;
  if (isLong) {
    // Find highest support below entry
    const supports = levels.filter((l) => l < entry && l > entry - atr * 3);
    if (supports.length) refinedStop = Math.min(stop, Math.min(...supports) - atr * 0.1);
  } else {
    const resistances = levels.filter((l) => l > entry && l < entry + atr * 3);
    if (resistances.length) refinedStop = Math.max(stop, Math.max(...resistances) + atr * 0.1);
  }

  return {
    entry: Math.round(entry),
    stop:  Math.round(refinedStop),
    tp1:   Math.round(tp1),
    tp2:   Math.round(tp2),
    rr:    Math.abs(tp1 - entry) / Math.abs(refinedStop - entry),
  };
}
