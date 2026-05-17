import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@nr-yn/db";

export const metadata: Metadata = {
  title: "Community Petitions",
  description:
    "Formal petitions compiled from community votes on Helldivers 2 balance issues and quality-of-life problems — presented to Arrowhead Game Studios.",
  openGraph: {
    title: "Community Petitions | HD2 Community Council",
    description:
      "Formal petitions compiled from community votes — presented to Arrowhead Game Studios.",
    url: "https://democracy.quorate.cc/petitions",
  },
  alternates: { canonical: "https://democracy.quorate.cc/petitions" },
};

interface ParsedPetition {
  id: string;
  name: string;
  publishedAt: Date;
}

export default async function PetitionsPage() {
  const artifacts = await prisma.artifact.findMany({
    where: { mimeType: "text/markdown" },
    orderBy: { uploadedAt: "desc" },
  });

  const published: ParsedPetition[] = [];
  for (const artifact of artifacts) {
    try {
      const meta = JSON.parse(artifact.description ?? "{}") as {
        publishedAt?: string | null;
        body?: string;
      };
      if (meta.publishedAt) {
        published.push({
          id: artifact.id,
          name: artifact.name,
          publishedAt: new Date(meta.publishedAt),
        });
      }
    } catch {
      // skip malformed
    }
  }

  published.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-bold tracking-widest uppercase"
          style={{ color: "#4ade80" }}
        >
          Community Petitions
        </h1>
        <p className="text-xs mt-1" style={{ color: "#6b9a6b" }}>
          Formal documents compiled from community votes — presented to the development team.
        </p>
      </div>

      {published.length === 0 ? (
        <div
          className="border rounded p-8 text-center"
          style={{ backgroundColor: "#0d1a0d", borderColor: "#1e3a1e" }}
        >
          <p className="text-sm tracking-widest uppercase" style={{ color: "#6b9a6b" }}>
            No petitions published yet.
          </p>
          <p className="text-xs mt-2" style={{ color: "#6b9a6b" }}>
            Petitions are generated at the end of each voting cycle.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {published.map((p) => (
            <Link
              key={p.id}
              href={`/petitions/${p.id}`}
              className="block border rounded p-5 transition-all hover:border-lime-700 group"
              style={{ backgroundColor: "#0d1a0d", borderColor: "#1e3a1e" }}
            >
              <div className="flex items-center justify-between gap-4">
                <p
                  className="font-bold text-sm group-hover:text-lime-400 transition-colors"
                  style={{ color: "#d4e8c2" }}
                >
                  {p.name}
                </p>
                <p className="text-xs shrink-0" style={{ color: "#6b9a6b" }}>
                  {p.publishedAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
