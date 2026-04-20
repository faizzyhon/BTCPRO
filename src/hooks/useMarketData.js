import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTickerAggregated, fetchKlines, fetchFunding, fetchOpenInterest } from "../utils/api.js";
import { buildIndicators } from "../utils/indicators.js";
import { useWebSocket } from "./useWebSocket.js";
import { MARKET_SOURCES, KLINES_URL, WS_URL, REFRESH_MS } from "../constants.js";

function buildFallbackCandles() {
  const now = Date.now();
  let price = 94_500;
  return Array.from({ length: 200 }, (_, i) => {
    const drift = Math.sin(i / 8) * 200 + Math.cos(i / 19) * 140;
    const noise = Math.sin(i * 1.87) * 80;
    const open = price;
    const close = open + drift * 0.18 + noise;
    const high = Math.max(open, close) + 180 + Math.abs(Math.sin(i)) * 140;
    const low  = Math.min(open, close) - 180 - Math.abs(Math.cos(i)) * 140;
    price = close;
    return { time: now - (199 - i) * 60_000, open, high, low, close, volume: 2_000 + Math.abs(Math.sin(i / 4)) * 1_600 };
  });
}

export function useMarketData(timeframe) {
  const [ticker, setTicker] = useState({ price: 0, change24h: 0, volume: 0, high24h: 0, low24h: 0, spread: 0, sources: [] });
  const [funding, setFunding] = useState(null);
  const [openInterest, setOpenInterest] = useState(null);
  const [candles, setCandles] = useState([]);
  const [indicators, setIndicators] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const candlesRef = useRef([]);

  const loadData = useCallback(async () => {
    try {
      const [tk, kl] = await Promise.all([
        fetchTickerAggregated(MARKET_SOURCES),
        fetchKlines(KLINES_URL(timeframe)),
      ]);
      setTicker(tk);
      candlesRef.current = kl;
      setCandles(kl);
      setIndicators(buildIndicators(kl));
      setError(null);
    } catch (err) {
      setError(err.message);
      if (!candlesRef.current.length) {
        const fb = buildFallbackCandles();
        candlesRef.current = fb;
        setCandles(fb);
        setIndicators(buildIndicators(fb));
      }
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  // Funding + OI — separate slower interval
  const loadFuturesData = useCallback(async () => {
    const [f, oi] = await Promise.all([fetchFunding(), fetchOpenInterest()]);
    if (f)  setFunding(f);
    if (oi) setOpenInterest(oi);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
    loadFuturesData();
    const id1 = setInterval(loadData, REFRESH_MS);
    const id2 = setInterval(loadFuturesData, 30_000);
    return () => { clearInterval(id1); clearInterval(id2); };
  }, [loadData, loadFuturesData]);

  const wsStatus = useWebSocket(WS_URL(timeframe), (msg) => {
    const stream = msg.stream || "";
    if (stream.includes("ticker")) {
      const d = msg.data;
      setTicker((prev) => ({ ...prev, price: +d.c, change24h: +d.P, volume: +d.q, high24h: +d.h, low24h: +d.l }));
    }
    if (stream.includes("kline")) {
      const k = msg.data?.k;
      if (!k?.x) return;
      const candle = { time: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
      setCandles((prev) => {
        const next = [...prev.filter((c) => c.time !== candle.time), candle].sort((a, b) => a.time - b.time);
        candlesRef.current = next;
        setIndicators(buildIndicators(next));
        return next;
      });
    }
  });

  return { ticker, funding, openInterest, candles, indicators, error, loading, wsStatus };
}
