import { prisma } from "@nryn/db";
import { NextRequest } from "next/server";
import { getOpenCycle, getOrCreateOpenCycle } from "@/lib/cycle";
import { COMMUNITY_ORG_ID, MAX_SUBMISSIONS_PER_EMAIL_PER_CYCLE } from "@/lib/config";
import { isSpam } from "@/lib/spam-filter";

const BASE_URL = "https://democracy.quorate.cc";
const VALID_CATEGORIES = new Set(["balance", "bug", "qol", "content"]);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") ?? null;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  if (category && !VALID_CATEGORIES.has(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const cycle = await getOpenCycle();

  const items = await prisma.agendaItem.findMany({
    where: {
      ...(cycle ? { meetingId: cycle.id } : {
        meeting: { organisationId: COMMUNITY_ORG_ID, meetingType: "council" },
      }),
      motions: {
        some: {
          outcome: "passed",
          motionType: { not: "amendment" },
          ...(category ? { resolutionType: category } : {}),
        },
      },
    },
    include: {
      motions: {
        where: { outcome: "passed", motionType: { not: "amendment" } },
        take: 1,
      },
    },
    take: limit,
  });

  const issues = items
    .map((ai) => {
      const m = ai.motions[0];
      if (!m) return null;
      let stale = false;
      try { stale = (JSON.parse(m.specialNotes ?? "{}") as { stale?: boolean }).stale === true; } catch { /**/ }
      return {
        id: ai.id,
        title: ai.title,
        description: ai.description ?? null,
        category: m.resolutionType ?? null,
        votes: m.votesFor ?? 0,
        stale,
        url: `${BASE_URL}/issues/${ai.id}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((x) => !x.stale)
    .sort((a, b) => b.votes - a.votes);

  return Response.json(
    { issues, cycle: cycle ? { id: cycle.id, status: cycle.status, title: cycle.title } : null, total: issues.length },
    { headers: { "Cache-Control": "public, s-maxage=60" } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    email?: string;
    title?: string;
    category?: string;
    description?: string;
    proposedChange?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const title = body.title?.trim();
  const category = body.category?.trim();
  const description = body.description?.trim();
  const proposedChange = body.proposedChange?.trim() ?? null;

  if (!email) return Response.json({ error: "Email is required" }, { status: 400 });
  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
  if (!category) return Response.json({ error: "Category is required" }, { status: 400 });
  if (!description) return Response.json({ error: "Problem statement is required" }, { status: 400 });

  const validCategories = ["balance", "bug", "qol", "content"];
  if (!validCategories.includes(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const cycle = await getOrCreateOpenCycle();

  if (cycle.status !== "pending") {
    return Response.json({ error: "Submission window has closed for this cycle" }, { status: 403 });
  }

  // Rate limit
  const existingItems = await prisma.agendaItem.findMany({
    where: { meetingId: cycle.id },
    include: { motions: { where: { specialNotes: { contains: email } } } },
  });
  const priorSubmissions = existingItems.filter((a) => a.motions.length > 0).length;
  if (priorSubmissions >= MAX_SUBMISSIONS_PER_EMAIL_PER_CYCLE) {
    return Response.json(
      { error: `Maximum ${MAX_SUBMISSIONS_PER_EMAIL_PER_CYCLE} submissions per cycle reached` },
      { status: 429 }
    );
  }

  // Heuristic pre-filter: silently reject obvious spam.
  // Counts toward the rate limit so spammers can't flood freely.
  // Governance-brain LLM handles the secondary check for anything that passes.
  const spam = isSpam(title, description);

  // Upsert person
  let person = await prisma.person.findUnique({ where: { email } });
  if (!person) {
    person = await prisma.person.create({
      data: { name: email.split("@")[0], email },
    });
  }

  const count = await prisma.agendaItem.count({ where: { meetingId: cycle.id } });

  const agendaItem = await prisma.agendaItem.create({
    data: {
      title,
      description,
      category: "decision",
      orderIndex: count + 1,
      meetingId: cycle.id,
    },
  });

  await prisma.motion.create({
    data: {
      motionText: title,
      resolutionType: category,
      specialNotes: JSON.stringify({ submitterEmail: email, proposedChange }),
      motionType: "ordinary",
      // Spam: silently failed. Clean: outcome null, governance-brain LLM picks it up.
      outcome: spam ? "failed" : null,
      agendaItemId: agendaItem.id,
    },
  });

  return Response.json({ issueId: agendaItem.id }, { status: 201 });
}
