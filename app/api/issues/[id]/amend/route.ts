import { prisma } from "@platform/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Sign in to propose an amendment" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    proposedChange?: string;
  };

  if (!body.proposedChange?.trim()) {
    return Response.json({ error: "Proposed change text is required" }, { status: 400 });
  }

  if (body.proposedChange.trim().length > 600) {
    return Response.json({ error: "Proposed change must be 600 characters or fewer" }, { status: 400 });
  }

  const agendaItem = await prisma.agendaItem.findUnique({
    where: { id },
    include: { motions: true, meeting: true },
  });

  if (!agendaItem) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  // Phase guard: amendments only during voting phase
  if (agendaItem.meeting.status !== "voting") {
    const msg = agendaItem.meeting.status === "pending"
      ? "Amendments open during the voting phase only"
      : "Voting has closed — amendments are no longer accepted";
    return Response.json({ error: msg }, { status: 403 });
  }

  // Issue must be approved (main motion outcome = "passed")
  const mainMotion = agendaItem.motions.find(
    (m) =>
      m.outcome === "passed" &&
      (m.motionType === "ordinary" || m.motionType === "procedural")
  );

  if (!mainMotion) {
    return Response.json({ error: "Issue must be approved before amendments can be submitted" }, { status: 400 });
  }

  const amendment = await prisma.motion.create({
    data: {
      agendaItemId: id,
      motionText: `Amendment: ${body.proposedChange.trim()}`,
      motionType: "amendment",
      outcome: null,
      specialNotes: JSON.stringify({
        submitterEmail: session.person.email,
        proposedChange: body.proposedChange.trim(),
      }),
    },
  });

  return Response.json({ amendmentId: amendment.id });
}
