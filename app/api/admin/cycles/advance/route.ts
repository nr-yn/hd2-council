import { prisma } from "@platform/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, COMMUNITY_ORG_ID } from "@/lib/config";
import { transitionCycle } from "@/lib/cycle";

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

  await transitionCycle(cycle.id, nextStatus);

  return Response.json({ newStatus: nextStatus });
}
