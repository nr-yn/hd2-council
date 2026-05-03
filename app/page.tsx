import Link from "next/link";
import { getOpenCycle } from "@/lib/cycle";
import { prisma } from "@platform/db";

async function getCycleStats(cycleId: string) {
  const agendaItems = await prisma.agendaItem.findMany({
    where: { meetingId: cycleId },
    include: { motions: true },
  });

  const approvedIssues = agendaItems.filter((a) =>
    a.motions.some((m) => m.outcome === "passed")
  );

  const totalVotes = approvedIssues.reduce((sum, a) => {
    const motion = a.motions.find((m) => m.outcome === "passed");
    return sum + (motion?.votesFor ?? 0);
  }, 0);

  return { approvedCount: approvedIssues.length, totalVotes };
}

export default async function HomePage() {
  const cycle = await getOpenCycle();
  let cycleStats: { approvedCount: number; totalVotes: number } | null = null;
  let daysRemaining: number | null = null;

  if (cycle) {
    cycleStats = await getCycleStats(cycle.id);
    const cycleEnd = new Date(cycle.date.getTime() + 14 * 24 * 60 * 60 * 1000);
    const msLeft = cycleEnd.getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  }

  return (
    <div className="space-y-10">

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative py-16 text-center overflow-hidden">
        {/* Background hazard stripe */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(-60deg, transparent 0, transparent 40px, rgba(201,162,39,.018) 40px, rgba(201,162,39,.018) 80px)",
          }}
        />

        <p className="display text-xs tracking-widest mb-6" style={{ color: "var(--se-text-faint)", letterSpacing: ".4em" }}>
          ★ PRIORITY DISPATCH — SUPER EARTH MINISTRY OF TRUTH ★
        </p>

        <h1
          className="display glow-gold"
          style={{
            color: "var(--se-gold)",
            fontSize: "clamp(2.8rem, 8vw, 5.5rem)",
            lineHeight: 1,
            letterSpacing: ".06em",
          }}
        >
          MANAGED
          <br />
          DEMOCRACY
        </h1>

        <p
          className="display mt-4"
          style={{
            color: "var(--se-text)",
            fontSize: "clamp(.9rem, 2.5vw, 1.4rem)",
            letterSpacing: ".25em",
          }}
        >
          HD2 COMMUNITY COUNCIL
        </p>

        <div
          className="mt-3 mx-auto"
          style={{
            width: "120px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, var(--se-gold), transparent)",
          }}
        />

        <p
          className="mt-5 mx-auto max-w-xl text-sm leading-relaxed"
          style={{ color: "var(--se-text-dim)" }}
        >
          CITIZENS of Super Earth — your grievances are weapons. Submit balance
          failures, vote on the issues that matter, and forge community petitions
          that reach the developers directly.{" "}
          <span style={{ color: "var(--se-gold)" }}>YOUR VOICE. YOUR DEMOCRACY.</span>
        </p>
      </section>

      {/* ── Cycle Status ─────────────────────────────── */}
      {cycle ? (
        <div className="cb-gold p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="pulse-live" />
            <span className="display text-xs tracking-widest" style={{ color: "var(--se-green)", letterSpacing: ".3em", fontSize: "11px" }}>
              {cycle.status === "voting" ? "VOTING OPEN — CAST YOUR VOICE"
                : cycle.status === "drafting" ? "DRAFTING — PETITION BEING COMPILED"
                : "SUBMISSIONS OPEN — FILE YOUR REPORT"}
            </span>
          </div>

          <div className="flex items-end justify-between flex-wrap gap-6">
            <div>
              <p className="display text-xl glow-green" style={{ color: "var(--se-green)" }}>
                {cycle.title}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--se-text-dim)" }}>
                INTELLIGENCE CYCLE — COMMUNITY RATIFICATION IN PROGRESS
              </p>
            </div>

            <div className="flex gap-8">
              <TacticalStat
                value={String(daysRemaining ?? 0).padStart(2, "0")}
                label="DAYS LEFT"
                color="var(--se-amber)"
              />
              <TacticalStat
                value={String(cycleStats?.approvedCount ?? 0).padStart(2, "0")}
                label="FIELD REPORTS"
                color="var(--se-green)"
              />
              <TacticalStat
                value={
                  (cycleStats?.totalVotes ?? 0) > 999
                    ? `${Math.floor((cycleStats?.totalVotes ?? 0) / 1000)}K+`
                    : String(cycleStats?.totalVotes ?? 0)
                }
                label="VOICES CAST"
                color="var(--se-gold)"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="cb-gold p-6 text-center hazard-gold">
          <p className="display text-sm tracking-widest" style={{ color: "var(--se-text-dim)", letterSpacing: ".3em" }}>
            ── NO ACTIVE VOTING CYCLE ──
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--se-text-dim)" }}>
            STAND BY FOR NEXT PRIORITY DISPATCH
          </p>
        </div>
      )}

      {/* ── Mission Briefings (CTA) ───────────────────── */}
      <div>
        <p className="display text-xs mb-4 tracking-widest" style={{ color: "var(--se-text-faint)", letterSpacing: ".3em" }}>
          ── MISSION BRIEFINGS ──────────────────────────────
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MissionCard
            href="/issues/submit"
            code="OBJ-01"
            title="File Field Report"
            body="Found a balance failure, critical bug, or quality-of-life deficiency? Submit it for community review. Every citizen's report counts."
            actionLabel="SUBMIT REPORT →"
            accent="var(--se-gold)"
          />
          <MissionCard
            href="/issues"
            code="OBJ-02"
            title="Browse Intelligence"
            body="Review approved field reports for the active cycle. Upvote the issues your squad cares about most. Numbers determine priority."
            actionLabel="VIEW DOSSIER →"
            accent="var(--se-green)"
          />
          <MissionCard
            href="/petitions"
            code="OBJ-03"
            title="Read Dispatches"
            body="Past voting cycles produce formal community petitions — classified intelligence documents forwarded to Arrowhead Game Studios."
            actionLabel="READ PETITIONS →"
            accent="var(--se-blue)"
          />
        </div>
      </div>

      {/* ── Propaganda Footer Strip ───────────────────── */}
      <div
        className="text-center py-4"
        style={{ borderTop: "1px solid var(--se-gold-dim)" }}
      >
        <p className="display text-xs tracking-widest" style={{ color: "var(--se-text-faint)", letterSpacing: ".35em", fontSize: "10px" }}>
          ★ SPREAD DEMOCRACY ★ FOR SUPER EARTH ★ LIBERTY OR DEATH ★ MANAGED DEMOCRACY ★
        </p>
      </div>
    </div>
  );
}

function TacticalStat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <p
        className="display tabular-nums"
        style={{ color, fontSize: "2rem", lineHeight: 1, textShadow: `0 0 10px ${color}88` }}
      >
        {value}
      </p>
      <p
        className="display mt-1"
        style={{ color: "var(--se-hint)", fontSize: "11px", letterSpacing: ".3em" }}
      >
        {label}
      </p>
    </div>
  );
}

function MissionCard({
  href,
  code,
  title,
  body,
  actionLabel,
  accent,
}: {
  href: string;
  title: string;
  code: string;
  body: string;
  actionLabel: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="block p-5 group transition-opacity hover:opacity-90"
      style={{
        backgroundColor: "var(--se-panel)",
        backgroundImage: `linear-gradient(var(--se-panel), var(--se-panel)) top left / 18px 1px no-repeat,
          linear-gradient(var(--se-panel), var(--se-panel)) top left / 1px 18px no-repeat,
          linear-gradient(${accent}, ${accent}) top left / 18px 1px no-repeat,
          linear-gradient(${accent}, ${accent}) top left / 1px 18px no-repeat,
          linear-gradient(${accent}, ${accent}) top right / 18px 1px no-repeat,
          linear-gradient(${accent}, ${accent}) top right / 1px 18px no-repeat,
          linear-gradient(${accent}, ${accent}) bottom left / 18px 1px no-repeat,
          linear-gradient(${accent}, ${accent}) bottom left / 1px 18px no-repeat,
          linear-gradient(${accent}, ${accent}) bottom right / 18px 1px no-repeat,
          linear-gradient(${accent}, ${accent}) bottom right / 1px 18px no-repeat`,
        backgroundRepeat: "no-repeat",
      }}
    >
      <p className="display text-xs mb-3" style={{ color: accent, fontSize: "11px", letterSpacing: ".35em" }}>
        {code} ──
      </p>
      <p className="display text-base mb-2" style={{ color: "var(--se-text)" }}>
        {title}
      </p>
      <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--se-text-dim)" }}>
        {body}
      </p>
      <p className="display text-xs" style={{ color: accent, fontSize: "11px", letterSpacing: ".2em" }}>
        {actionLabel}
      </p>
    </Link>
  );
}
