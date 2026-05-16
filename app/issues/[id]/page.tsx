import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@platform/db";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, MAX_VOTES_PER_EMAIL_PER_CYCLE } from "@/lib/config";
import UpvoteButton from "./UpvoteButton";
import { AmendmentForm } from "./AmendmentForm";
import ShareButtons from "./ShareButtons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const item = await prisma.agendaItem.findUnique({
    where: { id },
    select: { title: true, description: true },
  });

  if (!item) return { title: "Issue Not Found" };

  const snippet = item.description
    ? item.description.slice(0, 155).trimEnd() + (item.description.length > 155 ? "…" : "")
    : "Helldivers 2 community issue — vote to send it to Arrowhead Game Studios.";

  const url = `https://democracy.quorate.cc/issues/${id}`;

  return {
    title: item.title,
    description: snippet,
    openGraph: {
      title: `${item.title} | HD2 Community Council`,
      description: snippet,
      url,
      type: "article",
      images: [{ url: "https://democracy.quorate.cc/opengraph-image", width: 1200, height: 630, alt: "HD2 Community Council" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${item.title} | HD2 Community Council`,
      description: snippet,
      images: ["https://democracy.quorate.cc/opengraph-image"],
    },
    alternates: {
      canonical: url,
    },
  };
}

const CATEGORY_STYLE: Record<string, { color: string; label: string; clearance: string }> = {
  balance: { color: "#4ade80", label: "BALANCE REPORT",  clearance: "PRIORITY-1" },
  bug:     { color: "#dc2626", label: "CRITICAL BUG",    clearance: "URGENT" },
  qol:     { color: "#60a5fa", label: "QUALITY ISSUE",   clearance: "PRIORITY-2" },
  content: { color: "#c9a227", label: "CONTENT REQUEST", clearance: "PRIORITY-3" },
};

export default async function IssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const agendaItem = await prisma.agendaItem.findUnique({
    where: { id },
    include: {
      motions: { orderBy: { createdAt: "asc" } },
      meeting: true,
    },
  });

  if (!agendaItem) notFound();

  const motion = agendaItem.motions.find((m) => m.outcome === "passed");
  if (!motion) notFound();

  const session = await getSession();
  const isAdmin = session?.person.email === ADMIN_EMAIL;

  let alreadyVoted = false;
  let votesUsedThisCycle = 0;
  if (session) {
    const [existing, cycleVoteCount] = await Promise.all([
      prisma.vote.findFirst({
        where: { motionId: motion.id, voterId: session.personId },
      }),
      prisma.vote.count({
        where: {
          voterId: session.personId,
          motion: { agendaItem: { meetingId: agendaItem.meetingId } },
        },
      }),
    ]);
    alreadyVoted = existing !== null;
    votesUsedThisCycle = cycleVoteCount;
  }

  const notes = (() => {
    try {
      return JSON.parse(motion.specialNotes ?? "{}") as {
        submitterEmail?: string;
        proposedChange?: string;
        externalSignatures?: number;
        externalSource?: string;
        stale?: boolean;
        staledAt?: string;
      };
    } catch {
      return {};
    }
  })();

  const isStale = notes.stale === true;

  const passedAmendments = agendaItem.motions
    .filter((m) => m.motionType === "amendment" && m.outcome === "passed")
    .map((m) => {
      try {
        const n = JSON.parse(m.specialNotes ?? "{}") as {
          appliedText?: string;
          synthesized?: string;
          proposedChange?: string;
        };
        return {
          id: m.id,
          appliedText: n.appliedText ?? n.synthesized ?? n.proposedChange ?? "",
          createdAt: m.createdAt,
        };
      } catch {
        return null;
      }
    })
    .filter((a): a is { id: string; appliedText: string; createdAt: Date } => a !== null && a.appliedText !== "");

  const category = motion.resolutionType ?? "qol";
  const cat = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.qol;
  const isBug = category === "bug";
  const cycleStatus = agendaItem.meeting.status;
  const votingOpen = cycleStatus === "voting";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: agendaItem.title,
    description: agendaItem.description ?? undefined,
    url: `https://democracy.quorate.cc/issues/${id}`,
    datePublished: motion.createdAt.toISOString(),
    author: { "@type": "Organization", name: "HD2 Community Council" },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/VoteAction",
      userInteractionCount: motion.votesFor ?? 0,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="max-w-2xl space-y-6">

      {/* ── Back ─────────────────────────────────────── */}
      <Link
        href="/issues"
        className="display text-xs tracking-widest transition-opacity hover:opacity-60"
        style={{ color: "var(--se-text-dim)", letterSpacing: ".25em", fontSize: "11px" }}
      >
        ← BACK TO DOSSIER
      </Link>

      {/* ── Stale / Archived Banner ──────────────────── */}
      {isStale && (
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: "var(--se-panel)", border: "1px solid var(--se-hint)", opacity: 0.8 }}
        >
          <div className="flex items-center gap-3">
            <span
              className="display text-xs px-2 py-0.5"
              style={{ border: "1px solid var(--se-hint)", color: "var(--se-hint)", fontSize: "9px", letterSpacing: ".2em" }}
            >
              ARCHIVED
            </span>
            <span
              className="display text-xs"
              style={{ color: "var(--se-hint)", fontSize: "11px", letterSpacing: ".2em" }}
            >
              NO LONGER UNDER ACTIVE CONSIDERATION
            </span>
          </div>
          {notes.staledAt && (
            <span className="display text-xs" style={{ color: "var(--se-hint)", fontSize: "10px", letterSpacing: ".15em" }}>
              ARCHIVED{" "}
              {new Date(notes.staledAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      )}

      {/* ── Clearance Banner ─────────────────────────── */}
      <div
        className={`text-center py-1.5${isStale ? " opacity-50" : ""}`}
        style={{
          backgroundColor: cat.color,
          color: "var(--se-black)",
        }}
      >
        <p className="display text-xs tracking-widest" style={{ letterSpacing: ".35em", fontSize: "10px" }}>
          ★ {cat.clearance} · {cat.label} · CLASSIFIED TACTICAL BRIEF ★
        </p>
      </div>

      {/* ── Header Card ──────────────────────────────── */}
      <div
        className="p-6"
        style={{
          backgroundColor: "var(--se-panel)",
          backgroundImage: `
            linear-gradient(${cat.color}, ${cat.color}) top    left  / 20px 1px no-repeat,
            linear-gradient(${cat.color}, ${cat.color}) top    left  / 1px 20px no-repeat,
            linear-gradient(${cat.color}, ${cat.color}) top    right / 20px 1px no-repeat,
            linear-gradient(${cat.color}, ${cat.color}) top    right / 1px 20px no-repeat,
            linear-gradient(${cat.color}, ${cat.color}) bottom left  / 20px 1px no-repeat,
            linear-gradient(${cat.color}, ${cat.color}) bottom left  / 1px 20px no-repeat,
            linear-gradient(${cat.color}, ${cat.color}) bottom right / 20px 1px no-repeat,
            linear-gradient(${cat.color}, ${cat.color}) bottom right / 1px 20px no-repeat
          `,
        }}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 min-w-0 space-y-3">
            <p className="display text-xs tracking-widest" style={{ color: cat.color, fontSize: "9px", letterSpacing: ".35em" }}>
              REPORT CLASSIFICATION: {cat.label}
            </p>
            <h1
              className="display"
              style={{
                color: "var(--se-text)",
                fontSize: "1.3rem",
                letterSpacing: ".04em",
                lineHeight: 1.25,
              }}
            >
              {agendaItem.title}
            </h1>
            <div className="flex items-center gap-4 flex-wrap">
              <p className="text-xs" style={{ color: "var(--se-hint)" }}>
                FILED:{" "}
                {motion.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {isAdmin && notes.submitterEmail && (
                <p className="text-xs" style={{ color: "var(--se-hint)" }}>
                  BY: {notes.submitterEmail}
                </p>
              )}
            </div>
          </div>

          {/* Vote count */}
          <div className="text-right shrink-0">
            <p
              className="display tabular-nums"
              style={{
                color: cat.color,
                fontSize: "3rem",
                lineHeight: 1,
                textShadow: `0 0 12px ${cat.color}88`,
              }}
            >
              {(motion.votesFor ?? 0).toLocaleString()}
            </p>
            <p className="display" style={{ color: "var(--se-hint)", fontSize: "11px", letterSpacing: ".3em" }}>
              VOICES CAST
            </p>
          </div>
        </div>
      </div>

      {/* ── External Signal ─────────────────────────── */}
      {notes.externalSignatures !== undefined && (
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ backgroundColor: "var(--se-panel)", borderLeft: "2px solid var(--se-gold)" }}
        >
          <span
            className="display text-xs tracking-widest"
            style={{ color: "var(--se-gold)", letterSpacing: ".3em", fontSize: "11px" }}
          >
            ▸ EXTERNAL SIGNAL
          </span>
          <span className="display tabular-nums" style={{ color: "var(--se-gold)", fontSize: "1.4rem", lineHeight: 1 }}>
            {notes.externalSignatures.toLocaleString()}
          </span>
          <span
            className="display text-xs tracking-widest text-right"
            style={{ color: "var(--se-hint)", letterSpacing: ".2em", fontSize: "11px" }}
          >
            {notes.externalSource?.toUpperCase()}
          </span>
        </div>
      )}

      {/* ── Problem Statement ────────────────────────── */}
      {agendaItem.description && (
        <section className="p-5" style={{ backgroundColor: "var(--se-panel)" }}>
          <div
            className="flex items-center gap-3 mb-3 pb-2"
            style={{ borderBottom: "1px solid var(--se-text-faint)" }}
          >
            <span
              className="display text-xs tracking-widest"
              style={{ color: "var(--se-amber)", letterSpacing: ".3em", fontSize: "11px" }}
            >
              ▸ PROBLEM STATEMENT
            </span>
          </div>
          <div className="space-y-3">
            {agendaItem.description.split(/\n\s*\n/).map((para, i) => (
              <p key={i} className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--se-text-dim)", lineHeight: "1.75" }}>
                {para.trim()}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ── Proposed Change ──────────────────────────── */}
      {notes.proposedChange ? (
        <section className="p-5" style={{ backgroundColor: "var(--se-panel)" }}>
          <div
            className="flex items-center gap-3 mb-3 pb-2"
            style={{ borderBottom: `1px solid ${cat.color}44` }}
          >
            <span
              className="display text-xs tracking-widest"
              style={{ color: cat.color, letterSpacing: ".3em", fontSize: "11px" }}
            >
              ▸ PROPOSED CHANGE
            </span>
          </div>
          <ProposedChange text={notes.proposedChange} accent={cat.color} />
        </section>
      ) : (
        <section
          className="p-4 text-center"
          style={{
            backgroundColor: "var(--se-panel)",
            border: "1px dashed var(--se-text-faint)",
            opacity: 0.5,
          }}
        >
          <p className="display text-xs" style={{ color: "var(--se-hint)", letterSpacing: ".25em", fontSize: "11px" }}>
            NO PROPOSED CHANGE FILED — COMMUNITY MAY SUBMIT AMENDMENT
          </p>
        </section>
      )}


      {/* ── Amendment Log ────────────────────────────────── */}
      {passedAmendments.length > 0 && (
        <section className="p-5 space-y-3" style={{ backgroundColor: "var(--se-panel)" }}>
          <div
            className="flex items-center gap-3 pb-2"
            style={{ borderBottom: "1px solid var(--se-text-faint)" }}
          >
            <span
              className="display text-xs tracking-widest"
              style={{ color: "var(--se-blue)", letterSpacing: ".3em", fontSize: "11px" }}
            >
              ▸ AMENDMENT LOG
            </span>
            <span
              className="display text-xs px-1.5 py-0.5"
              style={{ backgroundColor: "var(--se-blue)", color: "var(--se-black)", fontSize: "9px", letterSpacing: ".15em" }}
            >
              {passedAmendments.length}
            </span>
          </div>
          <div className="space-y-3">
            {passedAmendments.map((a) => (
              <div
                key={a.id}
                className="p-3"
                style={{ borderLeft: "2px solid var(--se-blue)", backgroundColor: "var(--se-black)" }}
              >
                <p
                  className="display text-xs mb-1.5"
                  style={{ color: "var(--se-hint)", fontSize: "9px", letterSpacing: ".25em" }}
                >
                  AMENDED{" "}
                  {a.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--se-text-dim)", lineHeight: "1.7" }}>
                  {a.appliedText}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Amendment Section (voting phase only) ───────── */}
      {session && votingOpen && (
        <section className="p-5 space-y-3" style={{ backgroundColor: "var(--se-panel)" }}>
          <p
            className="display text-xs"
            style={{ color: "var(--se-hint)", letterSpacing: ".25em", fontSize: "11px" }}
          >
            ▸ COMMUNITY AMENDMENT
          </p>
          <AmendmentForm issueId={agendaItem.id} />
        </section>
      )}

      {/* ── Share ────────────────────────────────────── */}
      <ShareButtons
        url={`https://democracy.quorate.cc/issues/${agendaItem.id}`}
        title={agendaItem.title}
        votes={motion.votesFor ?? 0}
        proposedChange={notes.proposedChange ?? null}
        description={agendaItem.description ?? ""}
      />

      {/* ── Vote Section ─────────────────────────────── */}
      <div
        className={`p-5 ${isBug ? "hazard-march" : ""}`}
        style={{ backgroundColor: "var(--se-panel)" }}
      >
        {!votingOpen ? (
          <div className="text-center">
            <p className="display text-xs tracking-widest" style={{ color: "var(--se-text-dim)", letterSpacing: ".3em" }}>
              {cycleStatus === "pending"
                ? "STAND BY — VOTING PHASE NOT YET OPEN"
                : "VOTING HAS CLOSED — PETITION BEING COMPILED"}
            </p>
          </div>
        ) : !session ? (
          <div className="text-center space-y-3">
            <p className="display text-xs tracking-widest" style={{ color: "var(--se-text-dim)", letterSpacing: ".3em" }}>
              CITIZEN IDENTIFICATION REQUIRED TO VOTE
            </p>
            <Link
              href="/auth/sign-in"
              className="display inline-block px-5 py-2 text-xs tracking-widest transition-opacity hover:opacity-80"
              style={{
                color: "var(--se-black)",
                backgroundColor: "var(--se-gold)",
                letterSpacing: ".25em",
              }}
            >
              IDENTIFY YOURSELF →
            </Link>
          </div>
        ) : alreadyVoted ? (
          <div className="text-center">
            <p
              className="display text-sm tracking-widest"
              style={{ color: "var(--se-green)", letterSpacing: ".3em" }}
            >
              ✓ VOICE RECORDED — FOR DEMOCRACY
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="display text-xs text-center mb-3" style={{ color: "var(--se-hint)", letterSpacing: ".3em", fontSize: "11px" }}>
              CAST YOUR VOTE — YOUR DEMOCRACY DEMANDS IT
            </p>
            <UpvoteButton
              issueId={agendaItem.id}
              initialVotes={motion.votesFor ?? 0}
              votesRemaining={MAX_VOTES_PER_EMAIL_PER_CYCLE - votesUsedThisCycle}
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function ProposedChange({ text, accent, textColor = "var(--se-text)" }: { text: string; accent: string; textColor?: string }) {
  // Split on numbered list items that start on their own line (1. 2. 3. …)
  // Require \n before the digit so "Difficulty 10. Description" is NOT treated as a list
  const numbered = text.split(/(?=\n\d+\.\s)/).map(s => s.trim()).filter(Boolean);
  const hasNumbered = numbered.length > 1 || /^\d+\.\s/.test(text.trim());

  if (!hasNumbered) {
    const paragraphs = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    if (paragraphs.length <= 1) {
      return (
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: textColor, lineHeight: "1.75" }}>
          {text}
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm leading-relaxed whitespace-pre-line" style={{ color: textColor, lineHeight: "1.75" }}>
            {para}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {numbered.map((item, i) => {
        const match = item.match(/^(\d+)\.\s+([\s\S]*)/);
        if (!match) return (
          <p key={i} className="text-sm leading-relaxed whitespace-pre-line" style={{ color: textColor, lineHeight: "1.75" }}>
            {item}
          </p>
        );
        const [, num, body] = match;
        const firstStop = body.trim().search(/\.(?:\s|$)/);
        const headline = firstStop >= 0 ? body.trim().slice(0, firstStop + 1) : body.trim();
        const detail = firstStop >= 0 ? body.trim().slice(firstStop + 1).trim() : "";
        return (
          <div
            key={i}
            className="flex gap-4 p-4"
            style={{ borderLeft: `2px solid ${accent}`, backgroundColor: "var(--se-black)" }}
          >
            <span
              className="display shrink-0 tabular-nums"
              style={{ color: accent, fontSize: "1.4rem", lineHeight: 1, opacity: 0.7, minWidth: "1.5rem" }}
            >
              {num}
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold" style={{ color: textColor, lineHeight: "1.6" }}>
                {headline}
              </p>
              {detail && (
                <p className="text-sm leading-relaxed" style={{ color: textColor, lineHeight: "1.75", opacity: 0.75 }}>
                  {detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
