export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { prisma } = await import("@platform/db");
  const { COMMUNITY_ORG_ID } = await import("@/lib/config");

  try {
    const cycle = await prisma.meeting.findFirst({
      where: {
        organisationId: COMMUNITY_ORG_ID,
        meetingType: "council",
        status: { in: ["pending", "voting", "drafting"] },
      },
      orderBy: { date: "desc" },
    });

    if (!cycle) return;

    const motions = await prisma.motion.findMany({
      where: {
        outcome: "passed",
        motionType: { not: "amendment" },
        votesFor: 0,
        agendaItem: { meetingId: cycle.id },
      },
      select: { id: true, specialNotes: true },
    });

    const staledAt = new Date().toISOString();
    let marked = 0;
    for (const m of motions) {
      let notes: Record<string, unknown> = {};
      try { notes = JSON.parse(m.specialNotes ?? "{}") as Record<string, unknown>; } catch { /**/ }
      if (notes.stale) continue;
      notes.stale = true;
      notes.staledAt = staledAt;
      notes.staledReason = "zero_votes";
      await prisma.motion.update({ where: { id: m.id }, data: { specialNotes: JSON.stringify(notes) } });
      marked++;
    }

    if (marked > 0) console.log(`[startup] Marked ${marked} zero-vote issues as stale.`);
  } catch (e) {
    console.error("[startup] mark-stale failed:", e);
  }
}
