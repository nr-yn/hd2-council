export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { COMMUNITY_ORG_ID } = await import("@/lib/config");
  const { getOpenCycle, markZeroVoteMotionsStale } = await import("@nryn/governance");

  try {
    const cycle = await getOpenCycle(COMMUNITY_ORG_ID, "council");
    if (!cycle) return;

    const marked = await markZeroVoteMotionsStale(cycle.id);
    if (marked > 0) console.log(`[startup] Marked ${marked} zero-vote issues as stale.`);
  } catch (e) {
    console.error("[startup] mark-stale failed:", e);
  }
}
