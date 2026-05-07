import { prisma } from "@platform/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, COMMUNITY_ORG_ID, CYCLE_MIN_VOTING_DAYS } from "@/lib/config";
import { transitionCycle, getCycleStateArtifact, parseCycleState } from "@/lib/cycle";

const TRANSITIONS: Record<string, string> = {
  pending: "voting",
  voting: "drafting",
};

export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.person.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const cycle = await prisma.meeting.findFirst({
    where: {
      organisationId: COMMUNITY_ORG_ID,
      meetingType: "council",
      status: { in: ["pending", "voting"] },
    },
    orderBy: { date: "desc" },
  });

  if (!cycle) {
    return Response.json({ error: "No advanceable cycle found" }, { status: 404 });
  }

  const nextStatus = TRANSITIONS[cycle.status];
  if (!nextStatus) {
    return Response.json({ error: "Cycle cannot be advanced from current phase" }, { status: 400 });
  }

  if (cycle.status === "voting" && !process.env.E2E_BYPASS_VOTING_MIN_DAYS) {
    const stateArtifact = await getCycleStateArtifact(cycle.id);
    const state = parseCycleState(stateArtifact);
    const since = state.votingOpenedAt ? new Date(state.votingOpenedAt) : cycle.date;
    const ageDays = (Date.now() - since.getTime()) / 86_400_000;
    if (ageDays < CYCLE_MIN_VOTING_DAYS) {
      const daysLeft = Math.ceil(CYCLE_MIN_VOTING_DAYS - ageDays);
      return Response.json(
        { error: `Voting must be open for at least ${CYCLE_MIN_VOTING_DAYS} days. ${daysLeft} day(s) remaining.` },
        { status: 400 }
      );
    }
  }

  await transitionCycle(cycle.id, nextStatus);

  return Response.json({ newStatus: nextStatus });
}
