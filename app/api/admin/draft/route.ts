import { prisma } from "@nryn/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL, COMMUNITY_ORG_ID } from "@/lib/config";

const DRAFT_MIME = "application/x-petition-draft";

async function getDraftArtifact() {
  const cycle = await prisma.meeting.findFirst({
    where: { organisationId: COMMUNITY_ORG_ID, meetingType: "council", status: "drafting" },
    orderBy: { date: "desc" },
  });
  if (!cycle) return null;

  const artifact = await prisma.artifact.findFirst({
    where: { meetingId: cycle.id, mimeType: DRAFT_MIME },
    orderBy: { uploadedAt: "desc" },
  });
  return artifact ? { artifact, cycleId: cycle.id } : null;
}

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.person.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const result = await getDraftArtifact();
  if (!result) return Response.json({ error: "No draft found" }, { status: 404 });

  const { artifact } = result;
  let body = "";
  try {
    const meta = JSON.parse(artifact.description ?? "{}") as { body?: string };
    body = meta.body ?? "";
  } catch { /* empty draft */ }

  return Response.json({ artifactId: artifact.id, body });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.person.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const { body } = (await req.json().catch(() => ({}))) as { body?: string };
  if (typeof body !== "string") {
    return Response.json({ error: "body is required" }, { status: 400 });
  }

  const result = await getDraftArtifact();
  if (!result) return Response.json({ error: "No draft found" }, { status: 404 });

  const { artifact } = result;
  const existing = (() => {
    try { return JSON.parse(artifact.description ?? "{}") as Record<string, unknown>; }
    catch { return {}; }
  })();

  await prisma.artifact.update({
    where: { id: artifact.id },
    data: {
      description: JSON.stringify({ ...existing, body, savedAt: new Date().toISOString() }),
    },
  });

  return Response.json({ ok: true });
}
