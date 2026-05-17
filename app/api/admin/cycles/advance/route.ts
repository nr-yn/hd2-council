import { prisma } from "@nr-yn/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import {
  ADMIN_EMAIL,
  COMMUNITY_ORG_ID,
  CYCLE_MIN_VOTING_DAYS,
  TOP_N_ISSUES,
  MIN_VOTES_FOR_PETITION,
  CATEGORY_CAPS,
  CATEGORY_GUARANTEES,
} from "@/lib/config";
import { transitionCycle, getCycleStateArtifact, parseCycleState } from "@/lib/cycle";
import { generatePetitionDraft } from "@/lib/petition-draft";

const TRANSITIONS: Record<string, string> = {
  pending: "voting",
  voting: "drafting",
};

export const PETITION_DRAFT_MIME = "application/x-petition-draft";

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

  // When entering drafting, generate the editable markdown draft from vote results
  if (nextStatus === "drafting") {
    const agendaItems = await prisma.agendaItem.findMany({
      where: { meetingId: cycle.id },
      include: { motions: true },
    });

    const draft = generatePetitionDraft(cycle.title ?? "", agendaItems, {
      topN: TOP_N_ISSUES,
      minVotes: MIN_VOTES_FOR_PETITION,
      categoryCaps: CATEGORY_CAPS,
      categoryGuarantees: CATEGORY_GUARANTEES,
    });

    await prisma.artifact.create({
      data: {
        meetingId: cycle.id,
        name: `Draft — ${cycle.title}`,
        mimeType: PETITION_DRAFT_MIME,
        description: JSON.stringify({ body: draft, generatedAt: new Date().toISOString() }),
      },
    });
  }

  return Response.json({ newStatus: nextStatus });
}
