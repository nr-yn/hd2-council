import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@nr-yn/db";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, COMMUNITY_ORG_ID } from "@/lib/config";

// ── Types ────────────────────────────────────────────────────────────────────

type AmendmentStatus = "pending" | "auto-approved" | "admin-approved" | "rejected";

type AmendmentRecord = {
  motionId: string;
  issueId: string;
  issueTitle: string;
  cycleTitle: string;
  cycleStatus: string;
  // Content
  originalProposedChange: string | null;
  amendmentText: string;
  synthesized: string | null;
  appliedText: string | null;
  // Provenance
  status: AmendmentStatus;
  aiVerdict: string;
  aiReason: string;
  submitterEmail: string | null;
  // Timestamps
  submittedAt: Date;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveStatus(outcome: string | null, aiVerdict: string): AmendmentStatus {
  if (outcome === null) return "pending";
  if (outcome === "failed") return "rejected";
  // passed — was it the brain or a human?
  return aiVerdict === "auto-approve" ? "auto-approved" : "admin-approved";
}

const STATUS_CONFIG: Record<AmendmentStatus, { label: string; color: string }> = {
  "pending":       { label: "PENDING",        color: "var(--se-amber)" },
  "auto-approved": { label: "AUTO-APPROVED",  color: "var(--se-green)" },
  "admin-approved":{ label: "ADMIN-APPROVED", color: "var(--se-blue)"  },
  "rejected":      { label: "REJECTED",       color: "var(--se-red)"   },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ModeratePage() {
  const session = await getSession();
  if (!session || session.person.email !== ADMIN_EMAIL) notFound();

  // Query all amendment motions across all cycles for this org, newest first
  const rawMotions = await prisma.motion.findMany({
    where: {
      motionType: "amendment",
      agendaItem: {
        meeting: {
          organisationId: COMMUNITY_ORG_ID,
          meetingType: "council",
        },
      },
    },
    include: {
      agendaItem: {
        include: {
          motions: {
            where: { motionType: { not: "amendment" }, outcome: "passed" },
            take: 1,
          },
          meeting: { select: { title: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const records: AmendmentRecord[] = rawMotions.map((m) => {
    const notes = (() => {
      try {
        return JSON.parse(m.specialNotes ?? "{}") as {
          submitterEmail?: string;
          proposedChange?: string;
          synthesized?: string | null;
          appliedText?: string | null;
          aiVerdict?: string;
          aiReason?: string;
        };
      } catch { return {}; }
    })();

    const mainMotion = m.agendaItem.motions[0];
    const mainNotes = (() => {
      try { return JSON.parse(mainMotion?.specialNotes ?? "{}") as { proposedChange?: string }; }
      catch { return {}; }
    })();

    const aiVerdict = notes.aiVerdict ?? "flag";

    return {
      motionId: m.id,
      issueId: m.agendaItemId,
      issueTitle: m.agendaItem.title,
      cycleTitle: m.agendaItem.meeting.title ?? "Unknown Cycle",
      cycleStatus: m.agendaItem.meeting.status,
      originalProposedChange: mainNotes.proposedChange ?? null,
      amendmentText: notes.proposedChange ?? "",
      synthesized: notes.synthesized ?? null,
      appliedText: notes.appliedText ?? null,
      status: resolveStatus(m.outcome, aiVerdict),
      aiVerdict,
      aiReason: notes.aiReason ?? "",
      submitterEmail: notes.submitterEmail ?? null,
      submittedAt: m.createdAt,
    };
  });

  // Summary counts
  const counts = {
    total: records.length,
    pending: records.filter((r) => r.status === "pending").length,
    autoApproved: records.filter((r) => r.status === "auto-approved").length,
    adminApproved: records.filter((r) => r.status === "admin-approved").length,
    rejected: records.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="max-w-3xl space-y-8">

      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="display text-xs tracking-widest transition-opacity hover:opacity-60"
          style={{ color: "var(--se-text-dim)", letterSpacing: ".25em", fontSize: "11px" }}
        >
          ← ADMIN PANEL
        </Link>
        <h1
          className="display mt-3"
          style={{ color: "var(--se-gold)", fontSize: "1.6rem", letterSpacing: ".06em" }}
        >
          GOVERNANCE BRAIN — MODERATION LOG
        </h1>
        <p className="text-xs mt-1" style={{ color: "var(--se-hint)" }}>
          Full amendment audit trail — all cycles, all decisions. Includes AI verdicts and human overrides.
        </p>
      </div>

      {/* Summary bar */}
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: "repeat(5, 1fr)", backgroundColor: "var(--se-text-faint)" }}
      >
        {[
          { label: "TOTAL",         value: counts.total,        color: "var(--se-text-dim)" },
          { label: "PENDING",       value: counts.pending,      color: "var(--se-amber)"    },
          { label: "AUTO-APPROVED", value: counts.autoApproved, color: "var(--se-green)"    },
          { label: "ADMIN-APPROVED",value: counts.adminApproved,color: "var(--se-blue)"     },
          { label: "REJECTED",      value: counts.rejected,     color: "var(--se-red)"      },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="p-3 text-center"
            style={{ backgroundColor: "var(--se-panel)" }}
          >
            <p
              className="display tabular-nums"
              style={{ color, fontSize: "1.6rem", lineHeight: 1 }}
            >
              {value}
            </p>
            <p
              className="display"
              style={{ color: "var(--se-hint)", fontSize: "9px", letterSpacing: ".2em", marginTop: "4px" }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Records */}
      {records.length === 0 ? (
        <div className="p-6 text-center" style={{ backgroundColor: "var(--se-panel)" }}>
          <p className="display text-xs" style={{ color: "var(--se-text-dim)", letterSpacing: ".25em" }}>
            NO AMENDMENTS ON RECORD
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const sc = STATUS_CONFIG[r.status];
            return (
              <div
                key={r.motionId}
                className="p-4 space-y-3"
                style={{ backgroundColor: "var(--se-panel)", borderLeft: `2px solid ${sc.color}` }}
              >
                {/* Row 1: status + issue + cycle + date */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span
                      className="display text-xs px-1.5 py-0.5 shrink-0"
                      style={{ backgroundColor: sc.color, color: "var(--se-black)", fontSize: "9px", letterSpacing: ".2em" }}
                    >
                      {sc.label}
                    </span>
                    <Link
                      href={`/issues/${r.issueId}`}
                      className="display text-xs hover:opacity-70 truncate"
                      style={{ color: "var(--se-gold)", letterSpacing: ".1em", fontSize: "12px" }}
                    >
                      {r.issueTitle} →
                    </Link>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="display text-xs" style={{ color: "var(--se-hint)", fontSize: "10px", letterSpacing: ".2em" }}>
                      {r.cycleTitle.replace("Voting Cycle — ", "")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--se-hint)", fontSize: "10px" }}>
                      {r.submittedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      {r.submitterEmail && <> · {r.submitterEmail}</>}
                    </p>
                  </div>
                </div>

                {/* Row 2: AI verdict */}
                <div className="flex items-start gap-2">
                  <span
                    className="display text-xs px-1.5 py-0.5 shrink-0"
                    style={{
                      backgroundColor: r.aiVerdict === "auto-approve" ? "var(--se-green)" : "var(--se-amber)",
                      color: "var(--se-black)",
                      fontSize: "9px",
                      letterSpacing: ".15em",
                    }}
                  >
                    {r.aiVerdict === "auto-approve" ? "BRAIN: APPROVE" : "BRAIN: FLAG"}
                  </span>
                  {r.aiReason && (
                    <p className="text-xs leading-relaxed" style={{ color: "var(--se-hint)" }}>
                      {r.aiReason}
                    </p>
                  )}
                </div>

                {/* Row 3: amendment trail */}
                <div className="space-y-1.5 pl-1">
                  {r.originalProposedChange && (
                    <TrailRow label="ORIGINAL" color="var(--se-text-faint)" textColor="var(--se-text-dim)">
                      {r.originalProposedChange}
                    </TrailRow>
                  )}
                  <TrailRow label="SUBMITTED" color="var(--se-amber)" textColor="var(--se-text)">
                    {r.amendmentText}
                  </TrailRow>
                  {r.synthesized && (
                    <TrailRow label="SYNTHESIZED" color="var(--se-blue)" textColor="var(--se-text)">
                      {r.synthesized}
                    </TrailRow>
                  )}
                  {r.appliedText && r.status !== "rejected" && (
                    <TrailRow label="APPLIED" color="var(--se-green)" textColor="var(--se-text)">
                      {r.appliedText}
                    </TrailRow>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Trail row component ───────────────────────────────────────────────────────

function TrailRow({
  label,
  color,
  textColor,
  children,
}: {
  label: string;
  color: string;
  textColor: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderLeft: `2px solid ${color}`, paddingLeft: "8px" }}>
      <p
        className="display"
        style={{ color, fontSize: "9px", letterSpacing: ".2em", marginBottom: "2px" }}
      >
        {label}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: textColor, lineHeight: "1.65" }}>
        {children}
      </p>
    </div>
  );
}
