import { prisma } from "@platform/db";
import type { Meeting, Artifact } from "@platform/db";
import {
  COMMUNITY_ORG_ID,
  CYCLE_STATE_MIME,
  CYCLE_VOTE_THRESHOLD,
  CYCLE_MAX_VOTING_DAYS,
} from "./config";

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

// ── Auto-advance: votes threshold OR age fallback ─────────────────────────────

/**
 * Called after each vote is cast, and on admin page load.
 * Transitions voting → drafting when either:
 *   - Total votes across all approved issues reaches CYCLE_VOTE_THRESHOLD (4,000)
 *   - Voting phase has been open for CYCLE_MAX_VOTING_DAYS (30 days)
 */
export async function autoAdvanceIfNeeded(cycle: Meeting): Promise<boolean> {
  if (cycle.status !== "voting") return false;

  // Check 1: total vote count across all approved issues
  const motions = await prisma.motion.findMany({
    where: {
      outcome: "passed",
      agendaItem: { meetingId: cycle.id },
    },
    select: { votesFor: true },
  });
  const totalVotes = motions.reduce((sum, m) => sum + (m.votesFor ?? 0), 0);

  if (totalVotes >= CYCLE_VOTE_THRESHOLD) {
    await transitionCycle(cycle.id, "drafting");
    return true;
  }

  // Check 2: age fallback — 30 days since voting opened
  const stateArtifact = await getCycleStateArtifact(cycle.id);
  const state = parseCycleState(stateArtifact);
  const since = state.votingOpenedAt
    ? new Date(state.votingOpenedAt)
    : cycle.date;                  // fallback to cycle creation date

  const ageDays = (Date.now() - since.getTime()) / 86_400_000;
  if (ageDays >= CYCLE_MAX_VOTING_DAYS) {
    await transitionCycle(cycle.id, "drafting");
    return true;
  }

  return false;
}
