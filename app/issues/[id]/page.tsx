import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@platform/db";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, MAX_VOTES_PER_EMAIL_PER_CYCLE } from "@/lib/config";
import UpvoteButton from "./UpvoteButton";
import { AmendmentForm } from "./AmendmentForm";

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
    include: { motions: true, meeting: true },
  });

  if (!agendaItem) notFound();

  const motion = agendaItem.motions[0];
  if (!motion || motion.outcome !== "passed") notFound();

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
      };
    } catch {
      return {};
    }
  })();

  const category = motion.resolutionType ?? "qol";
  const cat = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.qol;
  const isBug = category === "bug";
  const cycleStatus = agendaItem.meeting.status;
  const votingOpen = cycleStatus === "voting";

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Back ─────────────────────────────────────── */}
      <Link
        href="/issues"
        className="display text-xs tracking-widest transition-opacity hover:opacity-60"
        style={{ color: "var(--se-text-dim)", letterSpacing: ".25em", fontSize: "10px" }}
      >
        ← BACK TO DOSSIER
      </Link>

      {/* ── Clearance Banner ─────────────────────────── */}
      <div
        className="text-center py-1.5"
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
        <div className="flex items-start justify-between gap-6">
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
              <p className="text-xs" style={{ color: "var(--se-text-faint)" }}>
                FILED:{" "}
                {motion.createdAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {isAdmin && notes.submitterEmail && (
                <p className="text-xs" style={{ color: "var(--se-text-faint)" }}>
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
            <p className="display" style={{ color: "var(--se-text-faint)", fontSize: "9px", letterSpacing: ".3em" }}>
              VOICES CAST
            </p>
          </div>
        </div>
      </div>

      {/* ── Problem Statement ────────────────────────── */}
      {agendaItem.description && (
        <section className="p-5" style={{ backgroundColor: "var(--se-panel)" }}>
          <div
            className="flex items-center gap-3 mb-3 pb-2"
            style={{ borderBottom: "1px solid var(--se-text-faint)", opacity: 1 }}
          >
            <span
              className="display text-xs tracking-widest"
              style={{ color: "var(--se-amber)", letterSpacing: ".3em", fontSize: "10px" }}
            >
              ▸ PROBLEM STATEMENT
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--se-text-dim)", lineHeight: "1.75" }}>
            {agendaItem.description}
          </p>
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
              style={{ color: cat.color, letterSpacing: ".3em", fontSize: "10px" }}
            >
              ▸ PROPOSED CHANGE
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--se-text)", lineHeight: "1.75" }}>
            {notes.proposedChange}
          </p>
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
          <p className="display text-xs" style={{ color: "var(--se-text-faint)", letterSpacing: ".25em", fontSize: "9px" }}>
            NO PROPOSED CHANGE FILED — COMMUNITY MAY SUBMIT AMENDMENT
          </p>
        </section>
      )}

      {/* ── Amendment Section (voting phase only) ───────── */}
      {session && votingOpen && (
        <section className="p-5 space-y-3" style={{ backgroundColor: "var(--se-panel)" }}>
          <p
            className="display text-xs"
            style={{ color: "var(--se-text-faint)", letterSpacing: ".25em", fontSize: "9px" }}
          >
            ▸ COMMUNITY AMENDMENT
          </p>
          <AmendmentForm issueId={agendaItem.id} />
        </section>
      )}

      {/* ── Vote Section ─────────────────────────────── */}
      <div
        className={`p-5 ${isBug ? "hazard-march" : ""}`}
        style={{ backgroundColor: "var(--se-panel)" }}
      >
        {!votingOpen ? (
          <div className="text-center">
            <p className="display text-xs tracking-widest" style={{ color: "var(--se-text-faint)", letterSpacing: ".3em" }}>
              {cycleStatus === "pending" ? "STAND BY — VOTING PHASE NOT YET OPEN"
                : "VOTING HAS CLOSED — PETITION BEING COMPILED"}
            </p>
          </div>
        ) : !session ? (
          <div className="text-center space-y-3">
            <p className="display text-xs tracking-widest" style={{ color: "var(--se-text-faint)", letterSpacing: ".3em" }}>
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
            <p className="display text-xs text-center mb-3" style={{ color: "var(--se-text-faint)", letterSpacing: ".3em", fontSize: "10px" }}>
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
  );
}
