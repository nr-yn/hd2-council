import { prisma } from "@nr-yn/db";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL } from "@/lib/config";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session || session.person.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { title?: string };
  const title = body.title?.trim();
  if (!title || title.length < 5 || title.length > 120) {
    return Response.json({ error: "Title must be 5–120 chars" }, { status: 400 });
  }

  await prisma.agendaItem.update({ where: { id }, data: { title } });
  return Response.json({ ok: true });
}
