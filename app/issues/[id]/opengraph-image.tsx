import { ImageResponse } from "next/og";
import { prisma } from "@platform/db";

export const alt = "HD2 Community Council — Field Report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORY_LABEL: Record<string, string> = {
  balance: "BALANCE",
  bug: "CRITICAL BUG",
  qol: "QOL",
  content: "CONTENT",
};

const CATEGORY_COLOR: Record<string, string> = {
  balance: "#c9a227",
  bug: "#ef4444",
  qol: "#4ade80",
  content: "#60a5fa",
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const item = await prisma.agendaItem.findUnique({
    where: { id },
    include: { motions: { where: { outcome: "passed" }, take: 1 } },
  });

  const title = item?.title ?? "Field Report";
  const votes = item?.motions[0]?.votesFor ?? 0;
  const category = item?.motions[0]?.resolutionType ?? "qol";
  const catLabel = CATEGORY_LABEL[category] ?? "FIELD REPORT";
  const catColor = CATEGORY_COLOR[category] ?? "#c9a227";

  const truncTitle = title.length > 60 ? title.slice(0, 58) + "…" : title;

  return new ImageResponse(
    <div
      style={{
        background: "#060604",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
      }}
    >
      {/* Top bar */}
      <div style={{ background: "#c9a227", padding: "10px 60px", display: "flex", alignItems: "center" }}>
        <span style={{ color: "#060604", fontSize: 12, letterSpacing: "0.35em" }}>
          ★ SUPER EARTH COMMUNITY DISPATCH TERMINAL ★ MANAGED DEMOCRACY PREVAILS ★
        </span>
      </div>

      {/* Category badge */}
      <div style={{ padding: "40px 60px 0", display: "flex" }}>
        <div style={{
          border: `2px solid ${catColor}`,
          color: catColor,
          fontSize: 11,
          letterSpacing: "0.35em",
          padding: "4px 14px",
          display: "flex",
        }}>
          {catLabel}
        </div>
      </div>

      {/* Title */}
      <div style={{ flex: 1, padding: "24px 60px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ color: "#c9a227", fontSize: 52, lineHeight: 1.15, letterSpacing: "0.04em", fontWeight: 700, display: "flex", flexWrap: "wrap" }}>
          {truncTitle}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: "0 60px 40px", display: "flex", alignItems: "center", gap: "60px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#4ade80", fontSize: 48, fontWeight: 700, letterSpacing: "0.06em", display: "flex" }}>
            {votes.toLocaleString()}
          </span>
          <span style={{ color: "#7a6a30", fontSize: 11, letterSpacing: "0.3em", display: "flex" }}>CITIZENS VOICED</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          background: "#c9a227",
          color: "#060604",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.3em",
          padding: "12px 28px",
          display: "flex",
        }}>
          CAST YOUR VOICE →
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #2a2210", padding: "16px 60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#7a6a30", fontSize: 13, letterSpacing: "0.2em", display: "flex" }}>democracy.quorate.cc</span>
        <span style={{ color: "#3a3018", fontSize: 12, letterSpacing: "0.3em", display: "flex" }}>HD2 COMMUNITY COUNCIL</span>
      </div>
    </div>,
    { ...size }
  );
}
