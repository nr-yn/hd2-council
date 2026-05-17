import { prisma } from "@nryn/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, COMMUNITY_ORG_ID } from "@/lib/config";
import { getCycleStateArtifact, parseCycleState, applyStalePolicy } from "@/lib/cycle";
import { STALE_THRESHOLD_PERCENT, STALE_MIN_KEEP } from "@/lib/config";
import type { DocumentMeta } from "@nryn/documents";

const DRAFT_MIME = "application/x-petition-draft";

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

  // Load the editable draft body
  const draftArtifact = await prisma.artifact.findFirst({
    where: { meetingId: cycle.id, mimeType: DRAFT_MIME },
    orderBy: { uploadedAt: "desc" },
  });

  if (!draftArtifact) {
    return Response.json({ error: "No draft found — open drafting phase first" }, { status: 400 });
  }

  let body = "";
  try {
    const meta = JSON.parse(draftArtifact.description ?? "{}") as { body?: string };
    body = meta.body ?? "";
  } catch { /* empty draft */ }

  if (!body.trim()) {
    return Response.json({ error: "Draft body is empty" }, { status: 400 });
  }

  // Stale the bottom half of issues before closing — keeps transparency while
  // signalling to users which reports no longer have active tracking.
  await applyStalePolicy(cycle.id, {
    type: "percentile",
    threshold: STALE_THRESHOLD_PERCENT,
    minKeep: STALE_MIN_KEEP,
  });

  // Build document metadata from cycle state + session
  const stateArtifact = await getCycleStateArtifact(cycle.id);
  const state = parseCycleState(stateArtifact);
  const now = new Date();
  const publishedAt = now.toISOString();

  const docMeta: DocumentMeta = {
    orgName: "Helldivers 2 Community",
    title: `Community Petition — ${cycle.title}`,
    documentType: "petition",
    timestamps: {
      submissionOpenedAt: state.submissionOpenedAt,
      votingOpenedAt: state.votingOpenedAt,
      draftingOpenedAt: state.draftingOpenedAt,
      publishedAt,
    },
    publishedBy: {
      name: session.person.name,
      email: session.person.email ?? "",
      role: "owner",
    },
  };

  const petitionTitle = `Helldivers 2 Community Petition — ${cycle.title}`;

  const finalisedCount = await prisma.meeting.count({
    where: { organisationId: COMMUNITY_ORG_ID, meetingType: "council", status: "finalised" },
  });
  const nextSeasonNum = finalisedCount + 2;
  const nextCycleTitle = `Voting Cycle — Season ${nextSeasonNum}`;

  // Atomically: finalise + publish artifact + open next cycle
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
        // Store body for web display + docMeta for on-demand PDF generation
        description: JSON.stringify({ body, publishedAt, documentMeta: docMeta }),
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

  // Discord webhook — fire and forget, never blocks publish
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    void fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: `📋 ${petitionTitle}`,
          description: "A new community petition has been published. Your voices have been heard.",
          url: `https://democracy.quorate.cc/petitions/${artifact.id}`,
          color: 0xc9a227,
          fields: [{ name: "View & Download", value: `[Read the petition →](https://democracy.quorate.cc/petitions/${artifact.id})` }],
          footer: { text: "HD2 Community Council • democracy.quorate.cc" },
        }],
      }),
    }).catch(() => { /* ignore */ });
  }

  return Response.json({ petitionId: artifact.id, nextCycle: nextCycleTitle });
}
