import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@nryn/db";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function TrackIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const agendaItem = await prisma.agendaItem.findUnique({
    where: { id },
    include: { motions: { orderBy: { createdAt: "desc" } } },
  });

  if (!agendaItem) notFound();

  // The main motion (not amendments)
  const motion = agendaItem.motions.find(
    (m) => m.motionType === "ordinary" || m.motionType === "procedural"
  ) ?? agendaItem.motions[0];

  if (!motion) notFound();

  const notes = (() => {
    try {
      return JSON.parse(motion.specialNotes ?? "{}") as {
        submitterEmail?: string;
        proposedChange?: string;
        rejectionReason?: string;
      };
    } catch {
      return {};
    }
  })();

  const status: "pending" | "approved" | "rejected" =
    motion.outcome === "passed"
      ? "approved"
      : motion.outcome === "failed"
        ? "rejected"
        : "pending";

  const STATUS_CONFIG = {
    pending: {
      label: "PENDING REVIEW",
      sublabel: "Your report is in the Command queue. Stand by, citizen.",
      color: "var(--se-amber)",
      bg: "rgba(245,158,11,.06)",
      icon: "⏳",
    },
    approved: {
      label: "APPROVED — ACTIVE",
      sublabel: "Your report has been approved and is live in the Intelligence Dossier.",
      color: "var(--se-green)",
      bg: "rgba(74,222,128,.04)",
      icon: "✓",
    },
    rejected: {
      label: "REJECTED",
      sublabel: notes.rejectionReason ?? "Your report did not meet the submission criteria.",
      color: "var(--se-red)",
      bg: "rgba(220,38,38,.04)",
      icon: "✗",
    },
  } as const;

  const cfg = STATUS_CONFIG[status];
  const cornerBrackets = [
    `linear-gradient(${cfg.color}, ${cfg.color}) top    left  / 20px 1px no-repeat`,
    `linear-gradient(${cfg.color}, ${cfg.color}) top    left  / 1px 20px no-repeat`,
    `linear-gradient(${cfg.color}, ${cfg.color}) top    right / 20px 1px no-repeat`,
    `linear-gradient(${cfg.color}, ${cfg.color}) top    right / 1px 20px no-repeat`,
    `linear-gradient(${cfg.color}, ${cfg.color}) bottom left  / 20px 1px no-repeat`,
    `linear-gradient(${cfg.color}, ${cfg.color}) bottom left  / 1px 20px no-repeat`,
    `linear-gradient(${cfg.color}, ${cfg.color}) bottom right / 20px 1px no-repeat`,
    `linear-gradient(${cfg.color}, ${cfg.color}) bottom right / 1px 20px no-repeat`,
  ].join(", ");

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href="/issues"
        className="display text-xs tracking-widest transition-opacity hover:opacity-60"
        style={{ color: "var(--se-text-dim)", letterSpacing: ".25em", fontSize: "11px" }}
      >
        ← BACK TO DOSSIER
      </Link>

      {/* Status banner */}
      <div
        className="p-6 text-center"
        style={{
          backgroundColor: cfg.bg,
          backgroundImage: cornerBrackets,
        }}
      >
        <p className="display text-3xl mb-2" style={{ color: cfg.color }}>
          {cfg.icon}
        </p>
        <p className="display text-sm tracking-widest" style={{ color: cfg.color, letterSpacing: ".2em" }}>
          {cfg.label}
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--se-text-dim)" }}>
          {cfg.sublabel}
        </p>
      </div>

      {/* Issue summary */}
      <div className="p-5 space-y-3" style={{ backgroundColor: "var(--se-panel)" }}>
        <p className="display text-xs" style={{ color: "var(--se-hint)", letterSpacing: ".3em", fontSize: "11px" }}>
          YOUR FIELD REPORT
        </p>
        <p className="display text-sm" style={{ color: "var(--se-text)" }}>
          {agendaItem.title}
        </p>
        {agendaItem.description && (
          <p className="text-xs leading-relaxed" style={{ color: "var(--se-text-dim)" }}>
            {agendaItem.description}
          </p>
        )}
        {notes.proposedChange && (
          <p
            className="text-xs leading-relaxed"
            style={{
              color: "var(--se-gold)",
              borderLeft: "2px solid var(--se-gold-dim)",
              paddingLeft: "8px",
            }}
          >
            Proposed: {notes.proposedChange}
          </p>
        )}
        <p className="text-xs" style={{ color: "var(--se-hint)" }}>
          Filed:{" "}
          {motion.createdAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* CTA */}
      {status === "approved" && (
        <Link
          href={`/issues/${agendaItem.id}`}
          className="display block w-full text-center py-3 text-xs tracking-widest transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--se-green)",
            color: "var(--se-black)",
            letterSpacing: ".25em",
            fontSize: "11px",
          }}
        >
          VIEW LIVE REPORT & VOTE →
        </Link>
      )}

      {status === "pending" && (
        <div className="text-center">
          <p className="display text-xs" style={{ color: "var(--se-hint)", letterSpacing: ".25em", fontSize: "11px" }}>
            BOOKMARK THIS PAGE TO CHECK YOUR STATUS
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--se-hint)", fontSize: "11px" }}>
            {`/issues/track/${agendaItem.id}`}
          </p>
        </div>
      )}

      {status === "rejected" && (
        <Link
          href="/issues/submit"
          className="display block w-full text-center py-3 text-xs tracking-widest transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--se-gold)",
            color: "var(--se-black)",
            letterSpacing: ".25em",
            fontSize: "11px",
          }}
        >
          FILE A NEW REPORT →
        </Link>
      )}
    </div>
  );
}
