import { prisma } from "@platform/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { MAX_VOTES_PER_EMAIL_PER_CYCLE } from "@/lib/config";
import { autoAdvanceIfNeeded } from "@/lib/cycle";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const agendaItem = await prisma.agendaItem.findUnique({
    where: { id },
    include: { motions: true, meeting: true },
  });

  if (!agendaItem) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  // Phase guard: voting only during the voting phase
  const cycleStatus = agendaItem.meeting.status;
  if (cycleStatus === "pending") {
    return Response.json({ error: "Voting has not opened yet" }, { status: 403 });
  }
  if (cycleStatus === "drafting" || cycleStatus === "finalised") {
    return Response.json({ error: "Voting has closed" }, { status: 403 });
  }

  const motion = agendaItem.motions.find((m) => m.outcome === "passed");
  if (!motion) {
    return Response.json({ error: "Issue is not approved for voting" }, { status: 400 });
  }

  // Stale issues are archived — no longer accepting votes
  let motionNotes: { stale?: boolean } = {};
  try { motionNotes = JSON.parse(motion.specialNotes ?? "{}") as typeof motionNotes; }
  catch { /* proceed */ }
  if (motionNotes.stale) {
    return Response.json({ error: "This issue has been archived — it is no longer under active consideration" }, { status: 403 });
  }

  // Check for existing vote
  const existingVote = await prisma.vote.findFirst({
    where: { motionId: motion.id, voterId: session.personId },
  });

  if (existingVote) {
    return Response.json({ error: "Already voted on this issue" }, { status: 409 });
  }

  // Rate limit: max votes per email per cycle
  const votesThisCycle = await prisma.vote.count({
    where: {
      voterId: session.personId,
      motion: { agendaItem: { meetingId: agendaItem.meetingId } },
    },
  });
  if (votesThisCycle >= MAX_VOTES_PER_EMAIL_PER_CYCLE) {
    return Response.json(
      { error: `Vote limit reached — each citizen may cast ${MAX_VOTES_PER_EMAIL_PER_CYCLE} votes per cycle` },
      { status: 429 }
    );
  }

  // Create vote and increment counter atomically
  const [, updated] = await prisma.$transaction([
    prisma.vote.create({
      data: {
        motionId: motion.id,
        voterId: session.personId,
        choice: "for",
        voteMethod: "online",
      },
    }),
    prisma.motion.update({
      where: { id: motion.id },
      data: { votesFor: { increment: 1 } },
    }),
  ]);

  // Auto-advance to drafting if vote threshold or age limit reached
  void autoAdvanceIfNeeded(agendaItem.meeting);

  return Response.json({ votesFor: updated.votesFor });
}
