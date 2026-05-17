import { prisma } from "@nr-yn/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL } from "@/lib/config";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session || session.person.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    action?: string;
    rejectionReason?: string;
  };

  if (body.action !== "approve" && body.action !== "reject") {
    return Response.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const agendaItem = await prisma.agendaItem.findUnique({
    where: { id },
    include: { motions: true },
  });

  if (!agendaItem) return Response.json({ error: "Issue not found" }, { status: 404 });

  const motion = agendaItem.motions.find((m) => m.outcome === null);
  if (!motion) return Response.json({ error: "No pending motion" }, { status: 400 });

  // Preserve existing specialNotes, add rejectionReason if rejecting
  let specialNotes = motion.specialNotes;
  if (body.action === "reject" && body.rejectionReason) {
    try {
      const existing = JSON.parse(motion.specialNotes ?? "{}") as Record<string, unknown>;
      existing.rejectionReason = body.rejectionReason;
      specialNotes = JSON.stringify(existing);
    } catch {
      specialNotes = JSON.stringify({ rejectionReason: body.rejectionReason });
    }
  }

  await prisma.motion.update({
    where: { id: motion.id },
    data: {
      outcome: body.action === "approve" ? "passed" : "failed",
      specialNotes,
    },
  });

  // Amendment approval: write the applied text back to the main motion's proposedChange
  if (motion.motionType === "amendment" && body.action === "approve") {
    const mainMotion = agendaItem.motions.find(
      (m) => m.outcome === "passed" && (m.motionType === "ordinary" || m.motionType === "procedural")
    );

    if (mainMotion) {
      try {
        const amendNotes = JSON.parse(motion.specialNotes ?? "{}") as {
          synthesized?: string;
          proposedChange?: string;
        };
        const appliedText = amendNotes.synthesized ?? amendNotes.proposedChange ?? "";

        if (appliedText) {
          const mainNotes = JSON.parse(mainMotion.specialNotes ?? "{}") as Record<string, unknown>;
          mainNotes.proposedChange = appliedText;
          await prisma.motion.update({
            where: { id: mainMotion.id },
            data: { specialNotes: JSON.stringify(mainNotes) },
          });
        }
      } catch {
        // Record is set to passed — admin can manually reconcile if note update fails
      }
    }
  }

  return Response.json({ ok: true });
}
