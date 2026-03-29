import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, TOP_N_ISSUES, MIN_VOTES_FOR_PETITION, CATEGORY_CAPS } from "@/lib/config";
import { getOpenCycle, getCycleStateArtifact, parseCycleState, autoAdvanceIfNeeded } from "@/lib/cycle";
import { prisma } from "@platform/db";
import Link from "next/link";
import AdminActions from "./AdminActions";

const CATEGORY_COLORS: Record<string, string> = {
  balance: "#4ade80",
  bug:     "#dc2626",
  qol:     "#60a5fa",
  content: "#c9a227",
};

const PHASE_LABELS: Record<string, { label: string; sublabel: string; color: string }> = {
  pending:  { label: "SUBMISSION PHASE", sublabel: "Accepting new field reports. Voting has not opened.", color: "var(--se-amber)" },
  voting:   { label: "VOTING PHASE", sublabel: "Community voting is open. No new submissions.", color: "var(--se-green)" },
  drafting: { label: "DRAFTING PHASE", sublabel: "Voting closed. Review the top issues and publish the petition.", color: "var(--se-blue)" },
};

export default async function AdminPage() {
  const session = await getSession();

  if (!session || session.person.email !== ADMIN_EMAIL) {
    return (
      <div className="text-center py-20">
        <p className="display text-sm tracking-widest" style={{ color: "var(--se-red)", letterSpacing: ".3em" }}>
          403 — ACCESS DENIED
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--se-text-dim)" }}>
          Admin credentials required.
        </p>
      </div>
    );
  }

  let cycle = await getOpenCycle();

  // Check auto-advance conditions (age fallback fires here even without votes)
  if (cycle) await autoAdvanceIfNeeded(cycle);
  if (cycle) cycle = await getOpenCycle(); // re-fetch if status changed

  // Phase state
  const stateArtifact = cycle ? await getCycleStateArtifact(cycle.id) : null;
  const cycleState = parseCycleState(stateArtifact);
  const phase = cycle ? (PHASE_LABELS[cycle.status] ?? PHASE_LABELS.pending) : null;

  // Pending issues — outcome null, submitted but not yet reviewed
  const pendingItems = cycle
    ? await prisma.agendaItem.findMany({
        where: { meetingId: cycle.id, motions: { some: { outcome: null } } },
        include: { motions: true },
        orderBy: { orderIndex: "asc" },
      })
    : [];

  const pendingIssues = pendingItems.map((a) => {
    const motion = a.motions.find((m) => m.outcome === null)!;
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
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      category: motion.resolutionType ?? "qol",
      submitterEmail: notes.submitterEmail ?? null,
      proposedChange: notes.proposedChange ?? null,
      createdAt: motion.createdAt,
    };
  });

  // Published petitions for this cycle
  const publishedPetitions = cycle
    ? await prisma.artifact
        .findMany({ where: { meetingId: cycle.id, mimeType: "text/markdown" }, orderBy: { uploadedAt: "desc" } })
        .then((rows) =>
          rows.filter((r) => {
            try {
              const m = JSON.parse(r.description ?? "{}") as { publishedAt?: string | null };
              return !!m.publishedAt;
            } catch {
              return false;
            }
          })
        )
    : [];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="display text-xs mb-1" style={{ color: "var(--se-text-faint)", letterSpacing: ".35em", fontSize: "10px" }}>
          COMMAND TERMINAL — RESTRICTED ACCESS
        </p>
        <h1 className="display glow-gold" style={{ color: "var(--se-gold)", fontSize: "1.8rem", letterSpacing: ".06em" }}>
          ADMIN PANEL
        </h1>
        <p className="text-xs mt-1" style={{ color: "var(--se-text-dim)" }}>
          Signed in as {session.person.email}
          &nbsp;·&nbsp;
          <Link href="/admin/moderate" style={{ color: "var(--se-gold)" }}>
            → Full moderation queue (Governance Brain)
          </Link>
        </p>
      </div>

      {/* Section 1: Pending Issues */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="display" style={{ color: "var(--se-amber)", fontSize: "1rem", letterSpacing: ".08em" }}>
            FLAGGED FOR REVIEW
          </h2>
          <span className="display px-2 py-0.5 text-xs" style={{ backgroundColor: "var(--se-amber)", color: "var(--se-black)" }}>
            {pendingIssues.length}
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--se-text-faint)" }}>
          Auto-moderation handles clean submissions and spam. Only edge cases reach this queue.
        </p>

        {!cycle && (
          <p className="text-xs" style={{ color: "var(--se-text-dim)" }}>
            No active cycle. Issues submitted will auto-create one.
          </p>
        )}

        {pendingIssues.length === 0 ? (
          <div className="cb-gold p-4 text-center">
            <p className="display text-xs" style={{ color: "var(--se-text-faint)", letterSpacing: ".25em" }}>
              NO PENDING REPORTS — QUEUE CLEAR
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingIssues.map((issue) => (
              <div key={issue.id} className="p-4 space-y-3" style={{ backgroundColor: "var(--se-panel)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="display text-xs" style={{ color: CATEGORY_COLORS[issue.category] ?? "#4ade80", fontSize: "9px", letterSpacing: ".25em" }}>
                        {issue.category.toUpperCase()}
                      </span>
                      {issue.submitterEmail && (
                        <span className="text-xs" style={{ color: "var(--se-text-faint)" }}>
                          · {issue.submitterEmail}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--se-text-faint)" }}>
                        · {issue.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="display text-sm" style={{ color: "var(--se-text)" }}>
                      {issue.title}
                    </p>
                    {issue.description && (
                      <p className="text-xs leading-relaxed" style={{ color: "var(--se-text-dim)" }}>
                        {issue.description}
                      </p>
                    )}
                    {issue.proposedChange && (
                      <p className="text-xs leading-relaxed" style={{ color: "var(--se-gold)", borderLeft: "2px solid var(--se-gold-dim)", paddingLeft: "8px" }}>
                        Proposed: {issue.proposedChange}
                      </p>
                    )}
                  </div>
                  <AdminActions issueId={issue.id} type="issue" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Active Cycle */}
      <section className="space-y-3">
        <h2 className="display" style={{ color: "var(--se-amber)", fontSize: "1rem", letterSpacing: ".08em" }}>
          ACTIVE CYCLE
        </h2>

        {cycle && phase ? (
          <div className="cb-gold p-5 space-y-4">
            {/* Phase status */}
            <div className="flex items-center gap-3 pb-3" style={{ borderBottom: "1px solid var(--se-gold-dim)" }}>
              <span
                className="display text-xs px-2 py-0.5"
                style={{ backgroundColor: phase.color, color: "var(--se-black)", letterSpacing: ".2em", fontSize: "9px" }}
              >
                {phase.label}
              </span>
              <p className="text-xs" style={{ color: "var(--se-text-dim)" }}>{phase.sublabel}</p>
            </div>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="display text-base glow-gold" style={{ color: "var(--se-gold)" }}>
                  {cycle.title}
                </p>
                <div className="text-xs space-y-0.5" style={{ color: "var(--se-text-faint)" }}>
                  <p>
                    Submission opened:{" "}
                    {cycleState.submissionOpenedAt
                      ? new Date(cycleState.submissionOpenedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : cycle.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  {cycleState.votingOpenedAt && (
                    <p>
                      Voting opened:{" "}
                      {new Date(cycleState.votingOpenedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                  {cycleState.draftingOpenedAt && (
                    <p>
                      Drafting opened:{" "}
                      {new Date(cycleState.draftingOpenedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
                {cycle.status === "drafting" && (
                  <p className="text-xs mt-2" style={{ color: "var(--se-text-faint)" }}>
                    Petition will include top {TOP_N_ISSUES} issues (min {MIN_VOTES_FOR_PETITION} votes) — up to {CATEGORY_CAPS.balance} balance, {CATEGORY_CAPS.bug} bug, {CATEGORY_CAPS.qol} QoL, {CATEGORY_CAPS.content} content.
                  </p>
                )}
              </div>
              <AdminActions cycleId={cycle.id} type="cycle" cyclePhase={cycle.status} />
            </div>
          </div>
        ) : (
          <div className="cb-gold p-4 text-center hazard-gold">
            <p className="display text-xs" style={{ color: "var(--se-text-faint)", letterSpacing: ".25em" }}>
              NO ACTIVE CYCLE
            </p>
          </div>
        )}
      </section>

      {/* Section 3: Published Petitions */}
      {publishedPetitions.length > 0 && (
        <section className="space-y-3">
          <h2 className="display" style={{ color: "var(--se-amber)", fontSize: "1rem", letterSpacing: ".08em" }}>
            PUBLISHED PETITIONS
          </h2>
          <div className="space-y-2">
            {publishedPetitions.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4" style={{ backgroundColor: "var(--se-panel)" }}>
                <p className="display text-sm" style={{ color: "var(--se-text)" }}>{p.name}</p>
                <Link
                  href={`/petitions/${p.id}`}
                  className="display text-xs transition-opacity hover:opacity-70"
                  style={{ color: "var(--se-gold)", letterSpacing: ".2em", fontSize: "10px" }}
                >
                  VIEW →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
