import type { Metadata } from "next";
import Link from "next/link";
import { getOpenCycle } from "@/lib/cycle";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL } from "@/lib/config";
import { prisma } from "@nr-yn/db";

const BASE_URL = "https://democracy.quorate.cc";

export const metadata: Metadata = {
  title: "Field Reports — Helldivers 2 Balance & Bug Issues",
  description:
    "Browse community-submitted Helldivers 2 balance issues, undocumented nerfs, bugs, and quality-of-life problems. Vote for the ones that matter most.",
  keywords: [
    "Helldivers 2 balance issues", "HD2 bugs", "HD2 nerfs", "Helldivers 2 feedback",
    "Arrowhead petition", "stratagems nerf", "weapons balance", "HD2 community",
  ],
  openGraph: {
    title: "Field Reports — Helldivers 2 Balance & Bug Issues",
    description:
      "Browse and vote on Helldivers 2 balance issues, undocumented nerfs, bugs, and quality-of-life problems submitted by the community.",
    url: `${BASE_URL}/issues`,
    images: [{ url: `${BASE_URL}/api/og`, width: 1200, height: 630, alt: "HD2 Community Council" }],
  },
  alternates: {
    canonical: `${BASE_URL}/issues`,
  },
};

const CATEGORY_STYLE: Record<string, { color: string; label: string }> = {
  balance: { color: "#4ade80", label: "BALANCE" },
  bug:     { color: "#dc2626", label: "CRITICAL BUG" },
  qol:     { color: "#60a5fa", label: "QOL" },
  content: { color: "#c9a227", label: "CONTENT" },
};

export default async function IssuesPage() {
  const [cycle, session] = await Promise.all([getOpenCycle(), getSession()]);
  const isAdmin = session?.person.email === ADMIN_EMAIL;

  // Always fetch all approved items (for SEO and no-cycle fallback)
  const allApprovedRaw = await prisma.agendaItem.findMany({
    where: { motions: { some: { outcome: "passed" } } },
    include: { motions: true },
    orderBy: { orderIndex: "asc" },
  });

  const mapApproved = (items: typeof allApprovedRaw) =>
    items
      .filter((a) => a.motions.some((m) => m.outcome === "passed"))
      .map((a) => {
        const motion = a.motions.find((m) => m.outcome === "passed")!;
        const notes = (() => {
          try {
            return JSON.parse(motion.specialNotes ?? "{}") as {
              submitterEmail?: string;
              proposedChange?: string;
              stale?: boolean;
            };
          } catch {
            return {};
          }
        })();
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          category: motion.resolutionType ?? "qol",
          votes: motion.votesFor ?? 0,
          submitterEmail: notes.submitterEmail ?? null,
          proposedChange: notes.proposedChange ?? null,
          stale: notes.stale === true,
        };
      })
      .sort((a, b) => b.votes - a.votes);

  if (!cycle) {
    const historicalItems = mapApproved(allApprovedRaw);
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Helldivers 2 Community Issues — All Approved Reports",
      url: `${BASE_URL}/issues`,
      numberOfItems: historicalItems.length,
      itemListElement: historicalItems.slice(0, 20).map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/issues/${item.id}`,
        name: item.title,
      })),
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="space-y-6">
          <div>
            <p className="display text-xs tracking-widest mb-1" style={{ color: "var(--se-hint)", letterSpacing: ".35em", fontSize: "11px" }}>
              TACTICAL PRIORITY DOSSIER
            </p>
            <h1 className="display glow-gold" style={{ color: "var(--se-gold)", fontSize: "1.8rem", letterSpacing: ".06em" }}>
              FIELD REPORTS
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--se-text-dim)" }}>
              No active voting cycle — {historicalItems.length} approved report{historicalItems.length !== 1 ? "s" : ""} on record
            </p>
          </div>

          <div className="cb-gold p-4 text-center">
            <p className="display text-xs tracking-widest" style={{ color: "var(--se-text-dim)", letterSpacing: ".3em" }}>
              ── STAND BY FOR NEXT PRIORITY DISPATCH ──
            </p>
            <Link
              href="/issues/submit"
              className="display inline-block mt-3 px-5 py-2 text-xs tracking-widest transition-opacity hover:opacity-80"
              style={{ color: "var(--se-black)", backgroundColor: "var(--se-gold)", letterSpacing: ".25em" }}
            >
              FILE A FIELD REPORT
            </Link>
          </div>

          {historicalItems.length > 0 && (
            <div className="space-y-3">
              {historicalItems.map((item, index) => {
                const cat = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.qol;
                return (
                  <Link
                    key={item.id}
                    href={`/issues/${item.id}`}
                    className="block p-5 group transition-opacity hover:opacity-90 relative overflow-hidden"
                    style={{
                      backgroundColor: "var(--se-panel)",
                      backgroundImage: `
                        linear-gradient(${cat.color}, ${cat.color}) top left  / 14px 1px no-repeat,
                        linear-gradient(${cat.color}, ${cat.color}) top left  / 1px 14px no-repeat,
                        linear-gradient(${cat.color}, ${cat.color}) bottom right / 14px 1px no-repeat,
                        linear-gradient(${cat.color}, ${cat.color}) bottom right / 1px 14px no-repeat
                      `,
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <span className="display shrink-0 tabular-nums" style={{ color: index < 3 ? cat.color : "var(--se-hint)", fontSize: "1.6rem", lineHeight: 1, width: "2.2rem", textAlign: "right" }}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="display" style={{ color: cat.color, fontSize: "11px", letterSpacing: ".3em" }}>{cat.label}</span>
                        <p className="display text-sm mt-1" style={{ color: "var(--se-text)", letterSpacing: ".03em" }}>{item.title}</p>
                        {item.description && (
                          <p className="text-xs mt-1 line-clamp-1 leading-relaxed" style={{ color: "var(--se-text-dim)" }}>{item.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="display tabular-nums" style={{ color: cat.color, fontSize: "1.5rem", lineHeight: 1 }}>{item.votes.toLocaleString()}</p>
                        <p className="display" style={{ color: "var(--se-hint)", fontSize: "11px", letterSpacing: ".25em" }}>VOICES</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  const cycleItemsRaw = await prisma.agendaItem.findMany({
    where: { meetingId: cycle.id },
    include: { motions: true },
    orderBy: { orderIndex: "asc" },
  });

  const allCycleItems = mapApproved(cycleItemsRaw);
  const approvedItems = allCycleItems.filter((i) => !i.stale);
  const staleItems = allCycleItems.filter((i) => i.stale);
  const topVotes = approvedItems[0]?.votes ?? staleItems[0]?.votes ?? 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Helldivers 2 Community Issues — ${cycle.title}`,
    url: `${BASE_URL}/issues`,
    numberOfItems: approvedItems.length,
    itemListElement: approvedItems.slice(0, 20).map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}/issues/${item.id}`,
      name: item.title,
    })),
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="space-y-6">

      {/* ── Dossier Header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="display text-xs tracking-widest mb-1" style={{ color: "var(--se-hint)", letterSpacing: ".35em", fontSize: "11px" }}>
            TACTICAL PRIORITY DOSSIER
          </p>
          <h1 className="display glow-gold" style={{ color: "var(--se-gold)", fontSize: "1.8rem", letterSpacing: ".06em" }}>
            FIELD REPORTS
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--se-text-dim)" }}>
            {cycle.title} &nbsp;·&nbsp; {approvedItems.length} report{approvedItems.length !== 1 ? "s" : ""} active
          </p>
        </div>
        {cycle.status === "pending" ? (
          <Link
            href="/issues/submit"
            className="display px-4 py-2 text-xs tracking-widest transition-opacity hover:opacity-80"
            style={{
              color: "var(--se-black)",
              backgroundColor: "var(--se-gold)",
              letterSpacing: ".2em",
              fontSize: "10px",
              whiteSpace: "nowrap",
            }}
          >
            + FILE REPORT
          </Link>
        ) : (
          <span
            className="display px-4 py-2 text-xs tracking-widest"
            style={{
              color: "var(--se-hint)",
              border: "1px solid var(--se-hint)",
              letterSpacing: ".2em",
              fontSize: "11px",
              whiteSpace: "nowrap",
              opacity: 0.6,
            }}
          >
            {cycle.status === "voting" ? "VOTING PHASE" : "DRAFTING PHASE"}
          </span>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(CATEGORY_STYLE).map(([key, { color, label }]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: color }} />
            <span className="display" style={{ color: "var(--se-hint)", fontSize: "11px", letterSpacing: ".2em" }}>
              {label}
            </span>
          </span>
        ))}
      </div>

      {/* ── List ───────────────────────────────────────── */}
      {approvedItems.length === 0 ? (
        <div className="cb-gold p-10 text-center hazard-gold">
          <p className="display text-sm tracking-widest" style={{ color: "var(--se-text-dim)", letterSpacing: ".3em" }}>
            NO APPROVED REPORTS IN THIS CYCLE
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--se-text-dim)" }}>
            Be the first to file a field report, citizen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvedItems.map((item, index) => {
            const cat = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.qol;
            const barPct = Math.max(4, Math.round((item.votes / topVotes) * 100));
            const isBug = item.category === "bug";

            return (
              <Link
                key={item.id}
                href={`/issues/${item.id}`}
                className={`block p-5 group transition-opacity hover:opacity-90 relative overflow-hidden ${isBug ? "hazard-march" : ""}`}
                style={{
                  backgroundColor: "var(--se-panel)",
                  backgroundImage: `
                    linear-gradient(${cat.color}, ${cat.color}) top left  / 14px 1px no-repeat,
                    linear-gradient(${cat.color}, ${cat.color}) top left  / 1px 14px no-repeat,
                    linear-gradient(${cat.color}, ${cat.color}) bottom right / 14px 1px no-repeat,
                    linear-gradient(${cat.color}, ${cat.color}) bottom right / 1px 14px no-repeat
                  `,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Rank number */}
                  <span
                    className="display shrink-0 tabular-nums"
                    style={{
                      color: index < 3 ? cat.color : "var(--se-hint)",
                      fontSize: "1.6rem",
                      lineHeight: 1,
                      textShadow: index < 3 ? `0 0 8px ${cat.color}66` : "none",
                      width: "2.2rem",
                      textAlign: "right",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="display"
                        style={{ color: cat.color, fontSize: "11px", letterSpacing: ".3em" }}
                      >
                        {cat.label}
                      </span>
                      {isAdmin && item.submitterEmail && (
                        <span className="text-xs" style={{ color: "var(--se-hint)" }}>
                          · {item.submitterEmail}
                        </span>
                      )}
                    </div>

                    <p
                      className="display text-sm group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--se-text)", letterSpacing: ".03em" }}
                    >
                      {item.title}
                    </p>

                    {item.description && (
                      <p
                        className="text-xs mt-1 line-clamp-1 leading-relaxed"
                        style={{ color: "var(--se-text-dim)" }}
                      >
                        {item.description}
                      </p>
                    )}

                    {/* Vote bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="flex-1 h-px"
                        style={{ backgroundColor: "var(--se-text-faint)", opacity: 0.3 }}
                      >
                        <div
                          style={{
                            width: `${barPct}%`,
                            height: "1px",
                            backgroundColor: cat.color,
                            boxShadow: `0 0 4px ${cat.color}88`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vote count */}
                  <div className="text-right shrink-0">
                    <p
                      className="display tabular-nums"
                      style={{
                        color: cat.color,
                        fontSize: "1.5rem",
                        lineHeight: 1,
                        textShadow: `0 0 8px ${cat.color}66`,
                      }}
                    >
                      {item.votes.toLocaleString()}
                    </p>
                    <p className="display" style={{ color: "var(--se-hint)", fontSize: "11px", letterSpacing: ".25em" }}>
                      VOICES
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {/* ── Archived / Stale Issues ────────────────────── */}
      {staleItems.length > 0 && (
        <div className="space-y-3 mt-8">
          <div
            className="flex items-center gap-3 py-2"
            style={{ borderTop: "1px solid var(--se-text-faint)", borderBottom: "1px solid var(--se-text-faint)" }}
          >
            <span
              className="display text-xs tracking-widest"
              style={{ color: "var(--se-hint)", letterSpacing: ".35em", fontSize: "11px" }}
            >
              ── ARCHIVED REPORTS
            </span>
            <span
              className="display text-xs px-1.5 py-0.5"
              style={{ border: "1px solid var(--se-hint)", color: "var(--se-hint)", fontSize: "9px", letterSpacing: ".15em" }}
            >
              {staleItems.length}
            </span>
          </div>
          <p
            className="display text-xs"
            style={{ color: "var(--se-hint)", letterSpacing: ".25em", fontSize: "10px", opacity: 0.7 }}
          >
            THESE ISSUES ARE NO LONGER UNDER ACTIVE CONSIDERATION — ARCHIVED FOR TRANSPARENCY
          </p>
          <div className="space-y-2">
            {staleItems.map((item) => {
              const cat = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE.qol;
              return (
                <Link
                  key={item.id}
                  href={`/issues/${item.id}`}
                  className="block p-4 group transition-opacity hover:opacity-70"
                  style={{
                    backgroundColor: "var(--se-panel)",
                    opacity: 0.45,
                    border: "1px solid var(--se-text-faint)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <span
                        className="display"
                        style={{ color: "var(--se-hint)", fontSize: "10px", letterSpacing: ".3em" }}
                      >
                        {cat.label}
                      </span>
                      <p
                        className="display text-sm mt-0.5"
                        style={{ color: "var(--se-text-dim)", letterSpacing: ".03em" }}
                      >
                        {item.title}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <span
                        className="display text-xs px-2 py-0.5"
                        style={{ border: "1px solid var(--se-hint)", color: "var(--se-hint)", fontSize: "9px", letterSpacing: ".2em" }}
                      >
                        ARCHIVED
                      </span>
                      <div>
                        <p className="display tabular-nums" style={{ color: "var(--se-hint)", fontSize: "1.1rem", lineHeight: 1 }}>
                          {item.votes.toLocaleString()}
                        </p>
                        <p className="display" style={{ color: "var(--se-hint)", fontSize: "9px", letterSpacing: ".2em" }}>
                          VOICES
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
