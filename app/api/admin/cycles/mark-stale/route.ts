import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, COMMUNITY_ORG_ID } from "@/lib/config";
import { getOpenCycle, markZeroVoteMotionsStale } from "@nr-yn/governance";

// POST /api/admin/cycles/mark-stale
// Marks all approved issues in the open cycle with votesFor = 0 as stale.
// Idempotent — safe to call multiple times.
export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.person.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const cycle = await getOpenCycle(COMMUNITY_ORG_ID, "council");
  if (!cycle) {
    return Response.json({ error: "No open cycle found" }, { status: 404 });
  }

  const markedCount = await markZeroVoteMotionsStale(cycle.id);
  return Response.json({ markedCount, cycleId: cycle.id });
}
