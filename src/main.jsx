import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#06080C", color: "#E2E8F0", padding: 32, fontFamily: "monospace" }}>
          <h2 style={{ color: "#FF3B52", marginTop: 0 }}>Runtime Error</h2>
          <pre style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 6, whiteSpace: "pre-wrap" }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: "8px 16px", background: "#0C0F14", color: "#22D3EE", border: "1px solid #22D3EE", borderRadius: 6, cursor: "pointer", fontFamily: "monospace" }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
