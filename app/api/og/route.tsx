import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#060604",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        <div style={{ background: "#c9a227", padding: "10px 60px", display: "flex", alignItems: "center" }}>
          <span style={{ color: "#060604", fontSize: 13, letterSpacing: "0.35em" }}>
            ★ SUPER EARTH COMMUNITY DISPATCH TERMINAL ★ MANAGED DEMOCRACY PREVAILS ★
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px" }}>
          <div style={{ color: "#3a3018", fontSize: 13, letterSpacing: "0.4em", marginBottom: "24px", display: "flex" }}>
            ★ PRIORITY DISPATCH — SUPER EARTH MINISTRY OF TRUTH ★
          </div>
          <div style={{ color: "#c9a227", fontSize: 96, lineHeight: 1, letterSpacing: "0.06em", fontWeight: 700, display: "flex" }}>
            MANAGED
          </div>
          <div style={{ color: "#c9a227", fontSize: 96, lineHeight: 1, letterSpacing: "0.06em", fontWeight: 700, display: "flex" }}>
            DEMOCRACY
          </div>
          <div style={{ color: "#d4c47a", fontSize: 22, letterSpacing: "0.25em", marginTop: "24px", display: "flex" }}>
            HD2 COMMUNITY COUNCIL
          </div>
          <div style={{ color: "#7a6a30", fontSize: 14, marginTop: "12px", display: "flex" }}>
            Vote on Helldivers 2 balance issues. Top issues become petitions sent to Arrowhead.
          </div>
        </div>

        <div style={{ borderTop: "1px solid #6a5410", padding: "20px 60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#7a6a30", fontSize: 14, letterSpacing: "0.2em", display: "flex" }}>democracy.quorate.cc</span>
          <span style={{ color: "#3a3018", fontSize: 13, letterSpacing: "0.35em", display: "flex" }}>★★★ FOR SUPER EARTH ★★★</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
