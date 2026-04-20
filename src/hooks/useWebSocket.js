import { useCallback, useEffect, useRef, useState } from "react";

const RECONNECT_BASE_MS = 1_500;
const RECONNECT_MAX_MS = 30_000;

export function useWebSocket(url, onMessage) {
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const onMsgRef = useRef(onMessage);
  onMsgRef.current = onMessage;

  const [status, setStatus] = useState("connecting");

  const connect = useCallback(() => {
    if (!mountedRef.current || !url) return;
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        retryRef.current = 0;
        setStatus("connected");
      };

      ws.onmessage = (evt) => {
        if (!mountedRef.current) return;
        try {
          onMsgRef.current(JSON.parse(evt.data));
        } catch {
          // malformed frame — skip
        }
      };

      ws.onerror = () => setStatus("error");

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setStatus("reconnecting");
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** retryRef.current, RECONNECT_MAX_MS);
        retryRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      };
    } catch {
      setStatus("error");
    }
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return status;
}
