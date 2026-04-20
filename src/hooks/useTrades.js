import { useCallback, useState } from "react";
import { readStore, writeStore } from "../utils/storage.js";
import { STORAGE_KEYS, DEFAULT_LEVERAGE, DEFAULT_RISK_PCT } from "../constants.js";

function calcLevPnl(trade, exitPrice) {
  const mult = trade.direction === "SHORT" ? -1 : 1;
  const priceDiff = (exitPrice - trade.entry) * mult;
  const pctMove = priceDiff / trade.entry;
  return pctMove * (trade.leverage || 1) * (trade.amountUsd || trade.entry * trade.sizeBtc);
}

function calcLiqPrice(entry, leverage, direction) {
  if (!leverage || leverage <= 1) return null;
  return direction === "LONG"
    ? entry * (1 - 1 / leverage)
    : entry * (1 + 1 / leverage);
}

function loadState() {
  return {
    open: readStore(STORAGE_KEYS.trades, []),
    closed: readStore(STORAGE_KEYS.closedTrades, []),
    balance: readStore(STORAGE_KEYS.balance, 10_000),
    leverage: readStore(STORAGE_KEYS.leverage, DEFAULT_LEVERAGE),
    defaultRiskPct: readStore(STORAGE_KEYS.defaultRiskPct, DEFAULT_RISK_PCT),
  };
}

export function useTrades() {
  const [state, setState] = useState(loadState);

  const openTrade = useCallback((trade) => {
    setState((prev) => {
      const leverage = trade.leverage ?? prev.leverage;
      const amountUsd = trade.amountUsd ?? (trade.sizeBtc * trade.entry);
      const liqPrice = calcLiqPrice(trade.entry, leverage, trade.direction);
      const newTrade = {
        ...trade,
        id: `t-${Date.now()}`,
        openedAt: new Date().toISOString(),
        leverage,
        amountUsd,
        liqPrice,
      };
      const next = { ...prev, open: [...prev.open, newTrade] };
      writeStore(STORAGE_KEYS.trades, next.open);
      return next;
    });
  }, []);

  const closeTrade = useCallback((id, exitPrice) => {
    setState((prev) => {
      const trade = prev.open.find((t) => t.id === id);
      if (!trade) return prev;
      const pnl = calcLevPnl(trade, exitPrice);
      const closed = { ...trade, exitPrice, closedAt: new Date().toISOString(), pnl };
      const nextOpen = prev.open.filter((t) => t.id !== id);
      const nextClosed = [closed, ...prev.closed].slice(0, 500);
      const next = { ...prev, open: nextOpen, closed: nextClosed };
      writeStore(STORAGE_KEYS.trades, nextOpen);
      writeStore(STORAGE_KEYS.closedTrades, nextClosed);
      return next;
    });
  }, []);

  const updateTrade = useCallback((id, patch) => {
    setState((prev) => {
      const nextOpen = prev.open.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...patch };
        updated.liqPrice = calcLiqPrice(updated.entry, updated.leverage, updated.direction);
        return updated;
      });
      writeStore(STORAGE_KEYS.trades, nextOpen);
      return { ...prev, open: nextOpen };
    });
  }, []);

  const deleteTrade = useCallback((id) => {
    setState((prev) => {
      const nextOpen = prev.open.filter((t) => t.id !== id);
      writeStore(STORAGE_KEYS.trades, nextOpen);
      return { ...prev, open: nextOpen };
    });
  }, []);

  const editClosedTrade = useCallback((id, patch) => {
    setState((prev) => {
      const nextClosed = prev.closed.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...patch };
        if (patch.exitPrice !== undefined || patch.entry !== undefined || patch.amountUsd !== undefined) {
          updated.pnl = calcLevPnl(updated, updated.exitPrice);
        }
        return updated;
      });
      writeStore(STORAGE_KEYS.closedTrades, nextClosed);
      return { ...prev, closed: nextClosed };
    });
  }, []);

  const deleteClosedTrade = useCallback((id) => {
    setState((prev) => {
      const nextClosed = prev.closed.filter((t) => t.id !== id);
      writeStore(STORAGE_KEYS.closedTrades, nextClosed);
      return { ...prev, closed: nextClosed };
    });
  }, []);

  const setBalance = useCallback((bal) => {
    setState((prev) => {
      writeStore(STORAGE_KEYS.balance, bal);
      return { ...prev, balance: bal };
    });
  }, []);

  const setLeverage = useCallback((lev) => {
    setState((prev) => {
      writeStore(STORAGE_KEYS.leverage, lev);
      return { ...prev, leverage: lev };
    });
  }, []);

  const setDefaultRiskPct = useCallback((pct) => {
    setState((prev) => {
      writeStore(STORAGE_KEYS.defaultRiskPct, pct);
      return { ...prev, defaultRiskPct: pct };
    });
  }, []);

  const stats = (() => {
    const { closed } = state;
    if (!closed.length) return { winRate: 0, avgWin: 0, avgLoss: 0, totalPnl: 0, profitFactor: 0, count: 0 };
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
    const losses = closed.filter((t) => (t.pnl ?? 0) <= 0);
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
    const totalWins = wins.reduce((s, t) => s + t.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    return {
      winRate: (wins.length / closed.length) * 100,
      avgWin,
      avgLoss,
      totalPnl: closed.reduce((s, t) => s + (t.pnl ?? 0), 0),
      profitFactor: totalLosses ? totalWins / totalLosses : totalWins > 0 ? 999 : 0,
      count: closed.length,
    };
  })();

  return {
    ...state,
    openTrade,
    closeTrade,
    updateTrade,
    deleteTrade,
    editClosedTrade,
    deleteClosedTrade,
    setBalance,
    setLeverage,
    setDefaultRiskPct,
    stats,
    calcLiqPrice,
  };
}
