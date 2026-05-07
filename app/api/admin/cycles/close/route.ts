import { prisma } from "@platform/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import {
  ADMIN_EMAIL,
  COMMUNITY_ORG_ID,
  TOP_N_ISSUES,
  MIN_VOTES_FOR_PETITION,
  CATEGORY_CAPS,
  CATEGORY_GUARANTEES,
} from "@/lib/config";
import { generatePetitionMarkdown } from "@/lib/petition-generator";
import { getCycleStateArtifact, parseCycleState } from "@/lib/cycle";

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

  if (cycle.status !== "drafting") {
    return Response.json(
      { error: "Cycle must be in drafting phase before closing" },
      { status: 400 }
    );
  }

  // Collect approved issues
  const agendaItems = await prisma.agendaItem.findMany({
    where: { meetingId: cycle.id },
    include: { motions: true },
  });

  const allApproved = agendaItems
    .map((a) => {
      const motion = a.motions.find((m) => m.outcome === "passed" && m.motionType !== "amendment");
      if (!motion) return null;
      const notes = (() => {
        try { return JSON.parse(motion.specialNotes ?? "{}") as { proposedChange?: string }; }
        catch { return {}; }
      })();
      return {
        title: a.title,
        category: motion.resolutionType ?? "qol",
        description: a.description,
        proposedChange: notes.proposedChange ?? null,
        votes: motion.votesFor ?? 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // ── Quota-based selection ────────────────────────────────────────────────
  const qualified = allApproved.filter((i) => i.votes >= MIN_VOTES_FOR_PETITION);

  // Group by category, sorted by votes descending within each group
  const byCategory: Record<string, typeof qualified> = {};
  for (const issue of qualified) {
    (byCategory[issue.category] ??= []).push(issue);
  }
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => b.votes - a.votes);
  }

  const selected: typeof qualified = [];
  const selectedCount: Record<string, number> = {};

  // Guarantee pass: take guaranteed minimums per category first
  for (const [cat, guarantee] of Object.entries(CATEGORY_GUARANTEES)) {
    if (guarantee > 0) {
      const candidates = byCategory[cat] ?? [];
      for (let i = 0; i < guarantee && i < candidates.length; i++) {
        selected.push(candidates[i]);
        selectedCount[cat] = (selectedCount[cat] ?? 0) + 1;
      }
    }
  }

  // Fill remaining slots from global vote-ranked list, respecting caps
  const globalRanked = [...qualified].sort((a, b) => b.votes - a.votes);
  for (const issue of globalRanked) {
    if (selected.length >= TOP_N_ISSUES) break;
    if (selected.includes(issue)) continue; // already in via guarantee
    const catCount = selectedCount[issue.category] ?? 0;
    const cap = CATEGORY_CAPS[issue.category] ?? TOP_N_ISSUES;
    if (catCount < cap) {
      selected.push(issue);
      selectedCount[issue.category] = catCount + 1;
    }
  }

  // Final sort: descending votes
  selected.sort((a, b) => b.votes - a.votes);
  // ────────────────────────────────────────────────────────────────────────

  // Get accurate phase timestamps from cycle-state artifact
  const stateArtifact = await getCycleStateArtifact(cycle.id);
  const state = parseCycleState(stateArtifact);
  const cycleStart = state.submissionOpenedAt ? new Date(state.submissionOpenedAt) : cycle.date;
  const cycleEnd = state.draftingOpenedAt ? new Date(state.draftingOpenedAt) : new Date();

  const markdown = generatePetitionMarkdown(cycleStart, cycleEnd, selected);
  const petitionTitle = `Helldivers 2 Community Petition — ${cycle.title}`;

  // Determine next season number
  const finalisedCount = await prisma.meeting.count({
    where: { organisationId: COMMUNITY_ORG_ID, meetingType: "council", status: "finalised" },
  });
  const nextSeasonNum = finalisedCount + 2;
  const nextCycleTitle = `Voting Cycle — Season ${nextSeasonNum}`;

  const now = new Date();

  // Atomically: finalise cycle + publish petition + open next cycle
  const [, artifact] = await prisma.$transaction([
    prisma.meeting.update({
      where: { id: cycle.id },
      data: { status: "finalised" },
    }),
    prisma.artifact.create({
      data: {
        meetingId: cycle.id,
        name: petitionTitle,
        mimeType: "text/markdown",
        description: JSON.stringify({ body: markdown, publishedAt: now.toISOString() }),
      },
    }),
    prisma.meeting.create({
      data: {
        id: `hd2-cycle-${Date.now()}`,
        organisationId: COMMUNITY_ORG_ID,
        meetingType: "council",
        title: nextCycleTitle,
        date: now,
        status: "pending",
      },
    }),
  ]);

  return Response.json({ petitionId: artifact.id, nextCycle: nextCycleTitle });
}
