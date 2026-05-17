import { prisma } from "@nr-yn/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { evaluateAmendment } from "@/lib/governance-brain";

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

  if (agendaItem.meeting.status !== "voting") {
    const msg = agendaItem.meeting.status === "pending"
      ? "Amendments open during the voting phase only"
      : "Voting has closed — amendments are no longer accepted";
    return Response.json({ error: msg }, { status: 403 });
  }

  const mainMotion = agendaItem.motions.find(
    (m) =>
      m.outcome === "passed" &&
      (m.motionType === "ordinary" || m.motionType === "procedural")
  );

  if (!mainMotion) {
    return Response.json({ error: "Issue must be approved before amendments can be submitted" }, { status: 400 });
  }

  const amendmentText = body.proposedChange.trim();

  // Parse current proposed change for brain evaluation
  let currentProposedChange = "";
  try {
    const notes = JSON.parse(mainMotion.specialNotes ?? "{}") as { proposedChange?: string };
    currentProposedChange = notes.proposedChange ?? "";
  } catch {
    // no-op
  }

  // Run through Governance Brain — fails safe to "flag" if unavailable
  const brain = currentProposedChange
    ? await evaluateAmendment(currentProposedChange, amendmentText)
    : { verdict: "flag" as const, reason: "No existing proposed change to compare against.", synthesized: null };

  const appliedText = brain.verdict === "auto-approve" && brain.synthesized
    ? brain.synthesized
    : amendmentText;

  const amendment = await prisma.motion.create({
    data: {
      agendaItemId: id,
      motionText: `Amendment: ${amendmentText}`,
      motionType: "amendment",
      outcome: brain.verdict === "auto-approve" ? "passed" : null,
      specialNotes: JSON.stringify({
        submitterEmail: session.person.email,
        proposedChange: amendmentText,
        synthesized: brain.synthesized,
        aiVerdict: brain.verdict,
        aiReason: brain.reason,
        appliedText: brain.verdict === "auto-approve" ? appliedText : null,
      }),
    },
  });

  // Auto-approved: update the live issue's proposed change immediately
  if (brain.verdict === "auto-approve") {
    try {
      const existing = JSON.parse(mainMotion.specialNotes ?? "{}") as Record<string, unknown>;
      existing.proposedChange = appliedText;
      await prisma.motion.update({
        where: { id: mainMotion.id },
        data: { specialNotes: JSON.stringify(existing) },
      });
    } catch {
      // If update fails the amendment record still exists — admin can apply manually
    }
  }

  return Response.json({
    amendmentId: amendment.id,
    verdict: brain.verdict,
  });
}
