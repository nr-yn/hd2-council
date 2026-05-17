import { prisma } from "@nr-yn/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL } from "@/lib/config";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session || session.person.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const artifact = await prisma.artifact.findUnique({ where: { id } });
  if (!artifact || artifact.mimeType !== "text/markdown") {
    return Response.json({ error: "Petition not found" }, { status: 404 });
  }

  let meta: { body?: string; publishedAt?: string | null } = {};
  try {
    meta = JSON.parse(artifact.description ?? "{}");
  } catch {
    return Response.json({ error: "Invalid petition data" }, { status: 500 });
  }

  if (meta.publishedAt) {
    return Response.json({ error: "Petition already published" }, { status: 409 });
  }

  await prisma.artifact.update({
    where: { id },
    data: {
      description: JSON.stringify({ ...meta, publishedAt: new Date().toISOString() }),
    },
  });

  return Response.json({ ok: true });
}
