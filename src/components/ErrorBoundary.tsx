import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DotSpend error boundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            height: "100%",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            background: "#0F0F12",
            color: "#fff",
            fontFamily: "'Inter', sans-serif",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #612AD5, #9B6EFF)",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 28 }}>!</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p
            style={{
              fontSize: 13,
              color: "#A1A1AA",
              maxWidth: 480,
              margin: 0,
              wordBreak: "break-word",
              fontFamily: "monospace",
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#612AD5",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
