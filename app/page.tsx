import type { Metadata } from "next";
import Link from "next/link";
import { getOpenCycle } from "@/lib/cycle";
import { prisma } from "@nr-yn/db";

export const metadata: Metadata = {
  title: "HD2 Community Council — Helldivers 2 Balance & Bug Tracker",
  description:
    "The Helldivers 2 community votes on balance issues, undocumented nerfs, bugs, and quality-of-life problems. Top issues become formal petitions sent to Arrowhead Game Studios.",
  alternates: { canonical: "https://democracy.quorate.cc" },
};

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

function getSignalStage(totalVotes: number): string {
  if (totalVotes >= 1000) return "READY";
  if (totalVotes >= 500) return "LOUD";
  if (totalVotes >= 100) return "STIRRING";
  return "QUIET";
}

export default async function HomePage() {
  const cycle = await getOpenCycle();
  let cycleStats: { approvedCount: number; totalVotes: number } | null = null;

  if (cycle) {
    cycleStats = await getCycleStats(cycle.id);
  }

  return (
    <div className="space-y-10">

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative py-20 text-center overflow-hidden">
        {/* Tactical grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(201,162,39,.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(201,162,39,.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse 80% 100% at 50% 50%, black 30%, transparent 100%)",
          }}
        />

        {/* Hazard stripe */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(-60deg, transparent 0, transparent 40px, rgba(201,162,39,.025) 40px, rgba(201,162,39,.025) 80px)",
          }}
        />

        {/* Large watermark star */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <span className="display" style={{ color: "var(--se-gold)", fontSize: "clamp(12rem, 35vw, 24rem)", opacity: .025, lineHeight: 1, userSelect: "none" }}>
            ★
          </span>
        </div>

        {/* CLASSIFIED stamp */}
        <div className="absolute top-6 right-6 pointer-events-none select-none" aria-hidden="true" style={{ transform: "rotate(12deg)" }}>
          <p className="display" style={{ color: "var(--se-red)", fontSize: "1rem", opacity: .18, letterSpacing: ".45em", border: "2px solid var(--se-red)", padding: "3px 10px" }}>
            CLASSIFIED
          </p>
        </div>

        <p className="boot-1 display text-xs tracking-widest mb-6" style={{ color: "var(--se-text-faint)", letterSpacing: ".4em" }}>
          ★ PRIORITY DISPATCH — SUPER EARTH MINISTRY OF TRUTH ★
        </p>

        <h1
          className="boot-2 display glow-gold"
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
          className="boot-3 display mt-4"
          style={{
            color: "var(--se-text)",
            fontSize: "clamp(.9rem, 2.5vw, 1.4rem)",
            letterSpacing: ".25em",
          }}
        >
          HD2 COMMUNITY COUNCIL
        </p>

        <div
          className="boot-3 mt-3 mx-auto"
          style={{
            width: "120px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, var(--se-gold), transparent)",
          }}
        />

        <p
          className="boot-4 mt-5 mx-auto max-w-xl text-sm leading-relaxed"
          style={{ color: "var(--se-text-dim)" }}
        >
          CITIZENS of Super Earth — your grievances are weapons. Submit balance
          failures, vote on the issues that matter, and forge community petitions
          that reach the developers directly.{" "}
          <span style={{ color: "var(--se-gold)" }}>YOUR VOICE. YOUR DEMOCRACY.</span>
        </p>
      </section>

      {/* ── Cycle Status ─────────────────────────────── */}
      <div className="boot-5">
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

            <div className="flex gap-8 items-end">
              <SignalMeter stage={getSignalStage(cycleStats?.totalVotes ?? 0)} />
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
      </div>

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

function SignalMeter({ stage }: { stage: string }) {
  const levels: Record<string, number> = { QUIET: 1, STIRRING: 2, LOUD: 3, READY: 4 };
  const filled = levels[stage] ?? 1;
  const color = stage === "READY" ? "var(--se-green)" : "var(--se-amber)";
  // Fixed pixel heights — matches the 32px (2rem) line-height of TacticalStat values
  const barHeights = [10, 17, 24, 32];

  return (
    <div className="text-center">
      <div
        className="flex items-end justify-center"
        style={{ height: "32px", gap: "4px" }}
      >
        {barHeights.map((h, i) => {
          const level = i + 1;
          return (
            <div
              key={level}
              style={{
                width: "8px",
                height: `${h}px`,
                backgroundColor: level <= filled ? color : "var(--se-text-faint)",
                boxShadow: level <= filled ? `0 0 6px ${color}aa` : "none",
                opacity: level <= filled ? 1 : 0.18,
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>
      <p className="display mt-1" style={{ color: "var(--se-hint)", fontSize: "11px", letterSpacing: ".3em" }}>
        SIGNAL
      </p>
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
      className="block p-5 group transition-all hover:opacity-90 hover:-translate-y-px"
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
