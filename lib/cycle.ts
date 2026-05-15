import { prisma } from "@platform/db";
import type { Meeting, Artifact } from "@platform/db";
import {
  COMMUNITY_ORG_ID,
  CYCLE_STATE_MIME,
  CYCLE_MAX_VOTING_DAYS,
} from "./config";

// ── Stale policy ──────────────────────────────────────────────────────────────

export interface StalePolicy {
  type: "percentile";
  threshold: number;  // 0..1 — fraction of issues to stale (0.5 = bottom 50%)
  minKeep?: number;   // minimum issues that always survive regardless of threshold
}

export async function applyStalePolicy(
  cycleId: string,
  policy: StalePolicy
): Promise<{ deletedCount: number; staledCount: number }> {
  // Step 1: delete issues already marked stale from prior season close
  const previouslyStale = await prisma.motion.findMany({
    where: {
      outcome: "passed",
      motionType: { not: "amendment" },
      agendaItem: { meetingId: cycleId },
      specialNotes: { contains: '"stale":true' },
    },
    select: { id: true, agendaItemId: true },
  });

  const staleMotionIds = previouslyStale.map((m) => m.id);
  const staleAgendaIds = previouslyStale.map((m) => m.agendaItemId);
  if (staleMotionIds.length > 0) {
    await prisma.vote.deleteMany({ where: { motionId: { in: staleMotionIds } } });
    await prisma.motion.deleteMany({ where: { id: { in: staleMotionIds } } });
    await prisma.agendaItem.deleteMany({ where: { id: { in: staleAgendaIds } } });
  }
  const deletedCount = staleMotionIds.length;

  // Step 2: mark bottom threshold% of remaining active issues as stale
  const motions = await prisma.motion.findMany({
    where: {
      outcome: "passed",
      motionType: { not: "amendment" },
      agendaItem: { meetingId: cycleId },
    },
    select: { id: true, votesFor: true, specialNotes: true },
    orderBy: { votesFor: "desc" },
  });

  if (motions.length === 0) return { deletedCount, staledCount: 0 };

  const minKeep = policy.minKeep ?? 1;
  const keepCount = Math.max(minKeep, Math.ceil(motions.length * (1 - policy.threshold)));
  const toStale = motions.slice(keepCount);

  if (toStale.length === 0) return { deletedCount, staledCount: 0 };

  const staledAt = new Date().toISOString();
  await Promise.all(
    toStale.map((m) => {
      let notes: Record<string, unknown> = {};
      try { notes = JSON.parse(m.specialNotes ?? "{}") as Record<string, unknown>; }
      catch { /* start fresh */ }
      notes.stale = true;
      notes.staledAt = staledAt;
      notes.staledReason = "season_cycle";
      return prisma.motion.update({
        where: { id: m.id },
        data: { specialNotes: JSON.stringify(notes) },
      });
    })
  );

  return { deletedCount, staledCount: toStale.length };
}

const ACTIVE_STATUSES = ["pending", "voting", "drafting"] as const;

export async function getOpenCycle(): Promise<Meeting | null> {
  return prisma.meeting.findFirst({
    where: {
      organisationId: COMMUNITY_ORG_ID,
      meetingType: "council",
      status: { in: [...ACTIVE_STATUSES] },
    },
    orderBy: { date: "desc" },
  });
}

export async function getOrCreateOpenCycle(): Promise<Meeting> {
  const existing = await getOpenCycle();
  if (existing) return existing;

  const now = new Date();
  const formattedDate = now.toISOString().slice(0, 10);

  const cycle = await prisma.meeting.create({
    data: {
      organisationId: COMMUNITY_ORG_ID,
      meetingType: "council",
      status: "pending",
      date: now,
      title: `Voting Cycle — ${formattedDate}`,
    },
  });

  // Create the cycle-state artifact to track phase timestamps
  await prisma.artifact.create({
    data: {
      meetingId: cycle.id,
      name: `Cycle State — ${cycle.title}`,
      mimeType: CYCLE_STATE_MIME,
      description: JSON.stringify({ submissionOpenedAt: now.toISOString() }),
    },
  });

  return cycle;
}

export async function getCycleStateArtifact(cycleId: string): Promise<Artifact | null> {
  return prisma.artifact.findFirst({
    where: { meetingId: cycleId, mimeType: CYCLE_STATE_MIME },
    orderBy: { uploadedAt: "desc" },
  });
}

export type CycleState = {
  submissionOpenedAt?: string;
  votingOpenedAt?: string;
  draftingOpenedAt?: string;
};

export function parseCycleState(artifact: Artifact | null): CycleState {
  try {
    return JSON.parse(artifact?.description ?? "{}") as CycleState;
  } catch {
    return {};
  }
}

// ── Phase transition (shared by admin advance route + auto-advance) ───────────

const TIMESTAMP_KEY: Record<string, keyof CycleState> = {
  voting: "votingOpenedAt",
  drafting: "draftingOpenedAt",
};

export async function transitionCycle(
  cycleId: string,
  nextStatus: string
): Promise<void> {
  const now = new Date().toISOString();
  const tsKey = TIMESTAMP_KEY[nextStatus];

  await prisma.meeting.update({
    where: { id: cycleId },
    data: { status: nextStatus },
  });

  const stateArtifact = await getCycleStateArtifact(cycleId);
  const state = parseCycleState(stateArtifact);
  if (tsKey) state[tsKey] = now;

  if (stateArtifact) {
    await prisma.artifact.update({
      where: { id: stateArtifact.id },
      data: { description: JSON.stringify(state) },
    });
  } else {
    const cycle = await prisma.meeting.findUnique({ where: { id: cycleId } });
    await prisma.artifact.create({
      data: {
        meetingId: cycleId,
        name: `Cycle State — ${cycle?.title ?? cycleId}`,
        mimeType: CYCLE_STATE_MIME,
        description: JSON.stringify(state),
      },
    });
  }
}

// ── Auto-advance: safety-net age fallback only ───────────────────────────────
// Season closes at admin discretion. This fires only after CYCLE_MAX_VOTING_DAYS
// as an emergency valve (default: 365 days).

export async function autoAdvanceIfNeeded(cycle: Meeting): Promise<boolean> {
  if (cycle.status !== "voting") return false;

  const stateArtifact = await getCycleStateArtifact(cycle.id);
  const state = parseCycleState(stateArtifact);
  const since = state.votingOpenedAt
    ? new Date(state.votingOpenedAt)
    : cycle.date;

  const ageDays = (Date.now() - since.getTime()) / 86_400_000;
  if (ageDays >= CYCLE_MAX_VOTING_DAYS) {
    await transitionCycle(cycle.id, "drafting");
    return true;
  }

  return false;
}
