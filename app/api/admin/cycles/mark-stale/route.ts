import { prisma } from "@platform/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, COMMUNITY_ORG_ID } from "@/lib/config";

// POST /api/admin/cycles/mark-stale
// Marks all approved issues in the open cycle with votesFor = 0 as stale.
// Idempotent — safe to call multiple times.
export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.person.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const cycle = await prisma.meeting.findFirst({
    where: {
      organisationId: COMMUNITY_ORG_ID,
      meetingType: "council",
      status: { in: ["pending", "voting", "drafting"] },
    },
    orderBy: { date: "desc" },
  });

  if (!cycle) {
    return Response.json({ error: "No open cycle found" }, { status: 404 });
  }

  const motions = await prisma.motion.findMany({
    where: {
      outcome: "passed",
      motionType: { not: "amendment" },
      votesFor: 0,
      agendaItem: { meetingId: cycle.id },
    },
    select: { id: true, specialNotes: true },
  });

  if (motions.length === 0) {
    return Response.json({ markedCount: 0 });
  }

  const staledAt = new Date().toISOString();
  await Promise.all(
    motions.map((m) => {
      let notes: Record<string, unknown> = {};
      try { notes = JSON.parse(m.specialNotes ?? "{}") as Record<string, unknown>; }
      catch { /* start fresh */ }
      if (notes.stale) return Promise.resolve();
      notes.stale = true;
      notes.staledAt = staledAt;
      notes.staledReason = "zero_votes";
      return prisma.motion.update({
        where: { id: m.id },
        data: { specialNotes: JSON.stringify(notes) },
      });
    })
  );

  const markedCount = motions.filter((m) => {
    try { return !(JSON.parse(m.specialNotes ?? "{}") as { stale?: boolean }).stale; }
    catch { return true; }
  }).length;

  return Response.json({ markedCount, cycleId: cycle.id });
}
