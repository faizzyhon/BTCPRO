import { useCallback, useEffect, useState } from "react";
import { C, NEWS_FEEDS, NEWS_REFRESH_MS } from "../constants.js";
import { fetchAllNews } from "../utils/api.js";

const IMPACT_COLOR = { HIGH: C.red, MED: C.amber, LOW: C.sub };

function TimeAgo({ pubDate }) {
  if (!pubDate) return null;
  const ms = Date.now() - new Date(pubDate).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return <span>{m}m ago</span>;
  const h = Math.floor(m / 60);
  if (h < 24) return <span>{h}h ago</span>;
  return <span>{Math.floor(h / 24)}d ago</span>;
}

function NewsItem({ item }) {
  const col = IMPACT_COLOR[item.impact] || C.muted;
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block", padding: "8px 10px",
        borderRadius: C.radius,
        background: C.bg,
        border: `1px solid ${C.border}`,
        marginBottom: 4,
        textDecoration: "none",
        transition: "border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = col + "44"; e.currentTarget.style.background = C.panel2; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}
    >
      <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
        <div style={{
          flexShrink: 0, width: 3, borderRadius: 2,
          background: col, alignSelf: "stretch",
          minHeight: 14,
        }} />
        <span style={{ fontSize: 12, fontFamily: C.sans, color: C.ink, lineHeight: 1.45, flex: 1 }}>
          {item.title}
        </span>
        <span style={{
          flexShrink: 0, fontSize: 9, fontFamily: C.mono, fontWeight: 800,
          padding: "2px 5px", borderRadius: 3, alignSelf: "flex-start",
          color: col, background: col + "15",
        }}>{item.impact}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: 9 }}>
        <span style={{ fontSize: 9, fontFamily: C.mono, color: C.muted }}>{item.source}</span>
        <span style={{ fontSize: 9, fontFamily: C.mono, color: C.muted }}>
          <TimeAgo pubDate={item.pubDate} />
        </span>
        {item.tags?.slice(0, 3).map((tag) => (
          <span key={tag} style={{
            fontSize: 8, fontFamily: C.mono, color: C.blue,
            padding: "0 4px", borderRadius: 2, background: C.blue + "15",
          }}>{tag}</span>
        ))}
      </div>
    </a>
  );
}

function Skeleton() {
  return (
    <>
      {[80, 100, 65, 90].map((w, i) => (
        <div key={i} style={{
          height: 62, borderRadius: C.radius,
          background: `linear-gradient(90deg, ${C.dim} 0%, ${C.panel2} 50%, ${C.dim} 100%)`,
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s ease infinite",
          marginBottom: 4,
        }} />
      ))}
    </>
  );
}

export default function NewsPanel() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const items = await fetchAllNews(NEWS_FEEDS);
      setNews(items);
      setLastUpdate(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError("News fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, NEWS_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const filtered = filter === "ALL" ? news : news.filter((n) => n.impact === filter);
  const counts = {
    ALL: news.length,
    HIGH: news.filter((n) => n.impact === "HIGH").length,
    MED:  news.filter((n) => n.impact === "MED").length,
    LOW:  news.filter((n) => n.impact === "LOW").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* Header */}
      <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontFamily: C.mono, color: C.sub, fontWeight: 700 }}>
            MARKET NEWS
            {lastUpdate && <span style={{ color: C.muted, fontWeight: 400, marginLeft: 6 }}>{lastUpdate}</span>}
          </span>
          <button onClick={load} style={{
            padding: "3px 8px", border: `1px solid ${C.border}`, cursor: "pointer",
            borderRadius: C.radius, background: C.dim, color: C.sub,
            fontFamily: C.mono, fontSize: 9, transition: "all 0.12s",
          }}>↻ Refresh</button>
        </div>

        <div style={{ display: "flex", gap: 3 }}>
          {["ALL", "HIGH", "MED", "LOW"].map((f) => {
            const col = f === "HIGH" ? C.red : f === "MED" ? C.amber : f === "LOW" ? C.sub : C.cyan;
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "3px 9px", border: "none", cursor: "pointer", borderRadius: C.radius,
                fontFamily: C.mono, fontSize: 9, fontWeight: 700,
                background: active ? col + "20" : "transparent",
                color: active ? col : C.muted,
                borderBottom: active ? `2px solid ${col}` : "2px solid transparent",
                transition: "all 0.12s",
              }}>
                {f} {counts[f] > 0 && <span style={{ opacity: 0.7 }}>({counts[f]})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {error && (
          <div style={{
            padding: "8px 10px", borderRadius: C.radius,
            background: C.redDim, border: `1px solid ${C.red}22`,
            fontSize: 10, fontFamily: C.mono, color: C.red, marginBottom: 8,
          }}>
            {error} — retrying automatically
          </div>
        )}
        {loading ? <Skeleton /> :
          filtered.length ? filtered.map((item) => <NewsItem key={item.id} item={item} />) : (
            <div style={{ textAlign: "center", padding: 32, color: C.muted, fontFamily: C.mono, fontSize: 11 }}>
              No {filter !== "ALL" ? filter + " impact" : ""} news found
            </div>
          )
        }
      </div>
    </div>
  );
}
