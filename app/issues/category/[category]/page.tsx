import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@platform/db";
import { getOpenCycle } from "@/lib/cycle";

const BASE_URL = "https://democracy.quorate.cc";

const CATEGORY_META: Record<string, { label: string; color: string; description: string; keywords: string[] }> = {
  balance: {
    label: "BALANCE",
    color: "#c9a227",
    description: "Helldivers 2 balance issues voted on by the community — weapon nerfs, stratagem tuning, enemy scaling, and meta problems.",
    keywords: ["Helldivers 2 balance", "HD2 nerfs", "stratagem balance", "weapon tuning", "HD2 meta issues"],
  },
  bug: {
    label: "CRITICAL BUG",
    color: "#ef4444",
    description: "Critical Helldivers 2 bugs reported and voted on by the community — crashes, audio issues, host migration, and gameplay-breaking bugs.",
    keywords: ["Helldivers 2 bugs", "HD2 crash", "Helldivers 2 glitch", "HD2 bug report", "host migration bug"],
  },
  qol: {
    label: "QUALITY OF LIFE",
    color: "#4ade80",
    description: "Helldivers 2 quality-of-life improvements the community wants — UI fixes, loadout presets, lobby browser, and usability enhancements.",
    keywords: ["Helldivers 2 QOL", "HD2 improvements", "Helldivers 2 UI", "loadout presets", "HD2 usability"],
  },
  content: {
    label: "CONTENT",
    color: "#60a5fa",
    description: "Helldivers 2 content requests from the community — new missions, story, monetisation concerns, Super Credits, and Warbond issues.",
    keywords: ["Helldivers 2 content", "HD2 Warbond", "Super Credits", "Helldivers 2 monetisation", "new HD2 content"],
  },
};

const VALID = new Set(Object.keys(CATEGORY_META));

export async function generateStaticParams() {
  return Object.keys(CATEGORY_META).map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  if (!VALID.has(category)) return { title: "Not Found" };
  const meta = CATEGORY_META[category]!;
  return {
    title: `${meta.label} Issues — Helldivers 2 Community Council`,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: `${meta.label} Issues — Helldivers 2`,
      description: meta.description,
      url: `${BASE_URL}/issues/category/${category}`,
      images: [{ url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630 }],
    },
    alternates: { canonical: `${BASE_URL}/issues/category/${category}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!VALID.has(category)) notFound();

  const meta = CATEGORY_META[category]!;
  const cycle = await getOpenCycle();

  const items = await prisma.agendaItem.findMany({
    where: {
      ...(cycle ? { meetingId: cycle.id } : {}),
      motions: { some: { outcome: "passed", motionType: { not: "amendment" }, resolutionType: category } },
    },
    include: { motions: { where: { outcome: "passed", motionType: { not: "amendment" } }, take: 1 } },
    orderBy: { orderIndex: "asc" },
  });

  const mapped = items
    .map((ai) => {
      const m = ai.motions[0];
      if (!m) return null;
      let stale = false;
      try { stale = (JSON.parse(m.specialNotes ?? "{}") as { stale?: boolean }).stale === true; } catch { /**/ }
      return { id: ai.id, title: ai.title, votes: m.votesFor ?? 0, stale };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && !x.stale)
    .sort((a, b) => b.votes - a.votes);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/issues" className="display text-xs tracking-widest transition-opacity hover:opacity-60"
          style={{ color: "var(--se-text-dim)", letterSpacing: ".25em", fontSize: "11px" }}>
          ← ALL FIELD REPORTS
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="display text-xs px-2 py-0.5"
            style={{ border: `1px solid ${meta.color}`, color: meta.color, fontSize: "10px", letterSpacing: ".3em" }}>
            {meta.label}
          </span>
          <h1 className="display" style={{ color: meta.color, fontSize: "1.6rem", letterSpacing: ".06em" }}>
            FIELD REPORTS
          </h1>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--se-text-dim)" }}>
          {mapped.length} report{mapped.length !== 1 ? "s" : ""} in this category
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_META).map(([cat, m]) => (
          <Link key={cat} href={`/issues/category/${cat}`}
            className="display text-xs px-3 py-1 transition-opacity hover:opacity-80"
            style={{ border: `1px solid ${cat === category ? m.color : "var(--se-text-faint)"}`, color: cat === category ? m.color : "var(--se-text-dim)", fontSize: "9px", letterSpacing: ".25em" }}>
            {m.label}
          </Link>
        ))}
      </div>

      {mapped.length === 0 ? (
        <p className="display text-xs" style={{ color: "var(--se-hint)", letterSpacing: ".25em" }}>NO ACTIVE REPORTS IN THIS CATEGORY</p>
      ) : (
        <div className="space-y-2">
          {mapped.map((item, index) => (
            <Link key={item.id} href={`/issues/${item.id}`}
              className="block p-4 group transition-all hover:opacity-90 hover:-translate-y-px"
              style={{ backgroundColor: "var(--se-panel)", border: "1px solid var(--se-text-faint)" }}>
              <div className="flex items-center gap-4">
                <span className="display shrink-0 tabular-nums"
                  style={{ color: index < 3 ? meta.color : "var(--se-hint)", fontSize: "1.4rem", lineHeight: 1, width: "2rem", textAlign: "right" }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="display text-sm" style={{ color: "var(--se-text)", letterSpacing: ".03em" }}>{item.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="display tabular-nums" style={{ color: meta.color, fontSize: "1.4rem", lineHeight: 1 }}>{item.votes.toLocaleString()}</p>
                  <p className="display" style={{ color: "var(--se-hint)", fontSize: "9px", letterSpacing: ".2em" }}>VOICES</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
