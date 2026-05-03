import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@platform/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artifact = await prisma.artifact.findUnique({ where: { id } });
  if (!artifact || artifact.mimeType !== "text/markdown") return { title: "Petition Not Found" };

  let meta: { body?: string; publishedAt?: string | null } = {};
  try { meta = JSON.parse(artifact.description ?? "{}"); } catch { return { title: "Petition Not Found" }; }
  if (!meta.publishedAt) return { title: "Petition Not Found" };

  const plain = (meta.body ?? "").replace(/[#*\[\]_>`-]/g, "").replace(/\n+/g, " ").trim();
  const snippet = plain.slice(0, 155).trimEnd() + (plain.length > 155 ? "…" : "");
  const url = `https://democracy.quorate.cc/petitions/${id}`;

  return {
    title: artifact.name,
    description: snippet,
    openGraph: {
      title: `${artifact.name} | HD2 Community Council`,
      description: snippet,
      url,
      type: "article",
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "HD2 Community Council" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${artifact.name} | HD2 Community Council`,
      description: snippet,
      images: ["/og-image.jpg"],
    },
    alternates: { canonical: url },
  };
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4" style="color:#4ade80">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3" style="color:#d4e8c2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-6 mb-2" style="color:#a3c9a3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#d4e8c2">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#a3c9a3">$1</em>')
    .replace(/^---$/gm, '<hr style="border-color:#1e3a1e;margin:2rem 0">')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#4ade80;text-decoration:underline;text-underline-offset:3px">$1</a>')
    .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-3" style="color:#a3c9a3">')
    .replace(/\n/g, "<br>");
}

export default async function PetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const artifact = await prisma.artifact.findUnique({ where: { id } });
  if (!artifact || artifact.mimeType !== "text/markdown") notFound();

  let meta: { body?: string; publishedAt?: string | null } = {};
  try {
    meta = JSON.parse(artifact.description ?? "{}");
  } catch {
    notFound();
  }

  if (!meta.publishedAt) notFound();

  const publishedAt = new Date(meta.publishedAt);
  const body = meta.body ?? "";

  return (
    <div className="max-w-2xl space-y-8">
      <Link
        href="/petitions"
        className="text-xs tracking-widest uppercase transition-colors"
        style={{ color: "#6b9a6b" }}
      >
        &larr; Back to Petitions
      </Link>

      <div
        className="border rounded p-2 text-center text-xs tracking-widest uppercase"
        style={{ backgroundColor: "#0a1a0a", borderColor: "#1e3a1e", color: "#6b9a6b" }}
      >
        Published{" "}
        {publishedAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>

      <article
        className="border rounded p-8"
        style={{ backgroundColor: "#0d1a0d", borderColor: "#1e3a1e" }}
        dangerouslySetInnerHTML={{
          __html: `<p class="text-sm leading-relaxed mb-3" style="color:#a3c9a3">${renderMarkdown(body)}</p>`,
        }}
      />
    </div>
  );
}
