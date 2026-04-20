import { useCallback, useEffect, useRef, useState } from "react";
import { calcEMASeries, calcBBSeries } from "../utils/indicators.js";
import { fmtUsd, fmtTime, fmtDate } from "../utils/formatters.js";
import { C } from "../constants.js";

const VOL_RATIO = 0.18;
const PAD = { top: 12, right: 64, bottom: 24, left: 8 };
const CANDLE_MIN_W = 2;
const CANDLE_MAX_W = 18;

export default function Chart({ candles, indicators, ticker }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const stateRef = useRef({ offset: 0, zoom: 1.0, dragging: false, dragStart: 0, dragOffset: 0, mouse: null });
  const [crosshair, setCrosshair] = useState(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const { offset, zoom } = stateRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.panel;
    ctx.fillRect(0, 0, W, H);

    const chartH = H * (1 - VOL_RATIO) - PAD.top - PAD.bottom;
    const volH = H * VOL_RATIO - 4;
    const drawW = W - PAD.left - PAD.right;

    // Number of visible candles
    const totalCandles = candles.length;
    const visibleCount = Math.round(drawW / (6 * zoom));
    const maxOffset = Math.max(0, totalCandles - visibleCount);
    const safeOffset = Math.max(0, Math.min(Math.round(offset), maxOffset));
    const startIdx = Math.max(0, totalCandles - visibleCount - safeOffset);
    const endIdx = Math.min(totalCandles, startIdx + visibleCount);
    const visible = candles.slice(startIdx, endIdx);
    if (!visible.length) return;

    const candleW = Math.max(CANDLE_MIN_W, Math.min(CANDLE_MAX_W, drawW / visible.length * 0.72));

    // Price range
    const priceHigh = Math.max(...visible.map((c) => c.high));
    const priceLow = Math.min(...visible.map((c) => c.low));
    const priceRange = priceHigh - priceLow || 1;
    const pricePad = priceRange * 0.06;

    const toX = (i) => PAD.left + (i / (visible.length)) * drawW + drawW / visible.length / 2;
    const toY = (price) => PAD.top + ((priceHigh + pricePad - price) / (priceRange + pricePad * 2)) * chartH;
    const toVolY = (vol, maxVol) => H - PAD.bottom - (vol / maxVol) * volH;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const price = priceLow - pricePad + ((priceRange + pricePad * 2) / gridCount) * i;
      const y = toY(price);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.font = `10px ${C.mono}`;
      ctx.textAlign = "left";
      ctx.fillText(fmtUsd(price, 0).replace("$", ""), W - PAD.right + 4, y + 3);
    }

    // Volume bars
    const maxVol = Math.max(...visible.map((c) => c.volume));
    visible.forEach((c, i) => {
      const x = toX(i);
      const isBull = c.close >= c.open;
      ctx.fillStyle = isBull ? "rgba(0,217,125,0.25)" : "rgba(255,59,82,0.25)";
      const volBarH = ((c.volume / maxVol) * volH);
      ctx.fillRect(x - candleW / 2, H - PAD.bottom - volBarH, candleW, volBarH);
    });

    // BB bands
    if (indicators?.bb) {
      const closes = candles.map((c) => c.close);
      const { upper, mid, lower } = calcBBSeries(closes);
      const sliceUpper = upper.slice(startIdx, endIdx);
      const sliceMid = mid.slice(startIdx, endIdx);
      const sliceLower = lower.slice(startIdx, endIdx);

      const drawLine = (series, color, dash = []) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash(dash);
        series.forEach((v, i) => {
          if (v == null) return;
          const x = toX(i), y = toY(v);
          i === 0 || series[i - 1] == null ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // BB fill
      ctx.beginPath();
      ctx.fillStyle = "rgba(59,130,246,0.05)";
      sliceUpper.forEach((v, i) => { if (v == null) return; i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)); });
      for (let i = sliceLower.length - 1; i >= 0; i--) {
        const v = sliceLower[i]; if (v == null) continue;
        ctx.lineTo(toX(i), toY(v));
      }
      ctx.closePath();
      ctx.fill();

      drawLine(sliceUpper, "rgba(59,130,246,0.4)");
      drawLine(sliceMid, "rgba(59,130,246,0.25)", [4, 3]);
      drawLine(sliceLower, "rgba(59,130,246,0.4)");
    }

    // EMA lines
    const closes = candles.map((c) => c.close);
    const ema21s = calcEMASeries(closes, 21).slice(startIdx, endIdx);
    const ema55s = calcEMASeries(closes, 55).slice(startIdx, endIdx);

    const drawEMA = (series, color) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      series.forEach((v, i) => {
        if (v == null) return;
        i === 0 || series[i - 1] == null ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v));
      });
      ctx.stroke();
    };
    drawEMA(ema21s, C.cyan);
    drawEMA(ema55s, C.purple);

    // Candles
    visible.forEach((c, i) => {
      const x = toX(i);
      const isBull = c.close >= c.open;
      const color = isBull ? C.green : C.red;

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

      // Body
      const bodyTop = Math.min(toY(c.open), toY(c.close));
      const bodyH = Math.max(Math.abs(toY(c.close) - toY(c.open)), 1);
      ctx.fillStyle = color;
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    // Current price line
    if (ticker?.price) {
      const py = toY(ticker.price);
      if (py >= PAD.top && py <= PAD.top + chartH) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(PAD.left, py);
        ctx.lineTo(W - PAD.right, py);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(W - PAD.right, py - 8, PAD.right - 2, 16);
        ctx.fillStyle = C.bg;
        ctx.font = `bold 10px ${C.mono}`;
        ctx.textAlign = "center";
        ctx.fillText(fmtUsd(ticker.price, 0).replace("$", ""), W - PAD.right / 2, py + 3);
      }
    }

    // Time labels
    ctx.fillStyle = C.muted;
    ctx.font = `9px ${C.mono}`;
    ctx.textAlign = "center";
    const labelEvery = Math.max(1, Math.floor(visible.length / 6));
    visible.forEach((c, i) => {
      if (i % labelEvery === 0) {
        ctx.fillText(fmtTime(c.time), toX(i), H - 4);
      }
    });
  }, [candles, indicators, ticker]);

  // Overlay canvas for crosshair (separate to avoid full redraw)
  const drawCrosshair = useCallback((mouse) => {
    const canvas = overlayRef.current;
    if (!canvas || !candles.length) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!mouse) return;

    const { x: mx, y: my } = mouse;
    const W = canvas.width, H = canvas.height;

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(W, my); ctx.stroke();
    ctx.setLineDash([]);
  }, [candles]);

  // Resize observer
  useEffect(() => {
    const resize = () => {
      const c1 = canvasRef.current, c2 = overlayRef.current;
      if (!c1 || !c2) return;
      const { width, height } = c1.parentElement.getBoundingClientRect();
      c1.width = c2.width = Math.floor(width);
      c1.height = c2.height = Math.floor(height);
      draw();
    };
    const ro = new ResizeObserver(resize);
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);
    resize();
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  // Mouse events on overlay
  const handleMouseMove = useCallback((e) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    stateRef.current.mouse = { x, y };
    drawCrosshair({ x, y });

    if (stateRef.current.dragging) {
      const dx = e.clientX - stateRef.current.dragStart;
      stateRef.current.offset = stateRef.current.dragOffset - dx / 6;
      draw();
    }

    // Find hovered candle for tooltip
    const W = overlayRef.current.width;
    const drawW = W - PAD.left - PAD.right;
    const { offset, zoom } = stateRef.current;
    const visibleCount = Math.round(drawW / (6 * zoom));
    const safeOffset = Math.max(0, Math.min(Math.round(offset), candles.length - visibleCount));
    const startIdx = Math.max(0, candles.length - visibleCount - safeOffset);
    const visible = candles.slice(startIdx, Math.min(candles.length, startIdx + visibleCount));
    const idx = Math.round(((x - PAD.left) / drawW) * visible.length - 0.5);
    const candle = visible[Math.max(0, Math.min(idx, visible.length - 1))];
    if (candle) setCrosshair({ candle, x, y });
  }, [candles, draw, drawCrosshair]);

  const handleMouseLeave = useCallback(() => {
    stateRef.current.mouse = null;
    stateRef.current.dragging = false;
    drawCrosshair(null);
    setCrosshair(null);
  }, [drawCrosshair]);

  const handleMouseDown = useCallback((e) => {
    stateRef.current.dragging = true;
    stateRef.current.dragStart = e.clientX;
    stateRef.current.dragOffset = stateRef.current.offset;
  }, []);

  const handleMouseUp = useCallback(() => {
    stateRef.current.dragging = false;
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    stateRef.current.zoom = Math.max(0.3, Math.min(4, stateRef.current.zoom * delta));
    draw();
  }, [draw]);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: C.panel, borderRadius: C.radius }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
      <canvas
        ref={overlayRef}
        style={{ position: "absolute", inset: 0, cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />

      {/* Legend */}
      <div style={{ position: "absolute", top: 8, left: 10, display: "flex", gap: 12, pointerEvents: "none" }}>
        {[["EMA21", C.cyan], ["EMA55", C.purple], ["BB", C.blue]].map(([label, color]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: C.mono, color: C.sub }}>
            <span style={{ width: 16, height: 2, background: color, display: "inline-block", borderRadius: 1 }} />
            {label}
          </span>
        ))}
      </div>

      {/* OHLCV tooltip */}
      {crosshair?.candle && (
        <div style={{
          position: "absolute", top: 8, right: 72, pointerEvents: "none",
          background: "rgba(12,15,20,0.92)", border: `1px solid ${C.border}`,
          borderRadius: C.radius, padding: "6px 10px", fontSize: 11, fontFamily: C.mono, color: C.sub,
          display: "grid", gridTemplateColumns: "auto auto", gap: "2px 10px",
        }}>
          {[
            ["O", crosshair.candle.open],
            ["H", crosshair.candle.high],
            ["L", crosshair.candle.low],
            ["C", crosshair.candle.close],
          ].map(([label, val]) => (
            <>
              <span key={`l-${label}`} style={{ color: C.muted }}>{label}</span>
              <span key={`v-${label}`} style={{ color: val >= crosshair.candle.open ? C.green : C.red, textAlign: "right" }}>
                {fmtUsd(val, 0)}
              </span>
            </>
          ))}
          <span style={{ color: C.muted }}>Time</span>
          <span style={{ textAlign: "right" }}>{fmtDate(crosshair.candle.time)}</span>
        </div>
      )}
    </div>
  );
}
