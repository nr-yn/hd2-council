import type { MetadataRoute } from "next";
import { prisma } from "@platform/db";

export const dynamic = "force-dynamic";

const BASE = "https://democracy.quorate.cc";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [approvedItems, petitions] = await Promise.all([
    prisma.agendaItem.findMany({
      where: { motions: { some: { outcome: "passed" } } },
      select: { id: true },
    }),
    prisma.artifact.findMany({
      where: { mimeType: "text/markdown" },
      select: { id: true, uploadedAt: true, description: true },
    }),
  ]);

  const issueUrls: MetadataRoute.Sitemap = approvedItems.map((item) => ({
    url: `${BASE}/issues/${item.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const petitionUrls: MetadataRoute.Sitemap = petitions
    .filter((a) => {
      try { return !!JSON.parse(a.description ?? "{}").publishedAt; } catch { return false; }
    })
    .map((a) => ({
      url: `${BASE}/petitions/${a.id}`,
      lastModified: a.uploadedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [
    { url: BASE,                     lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/issues`,         lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/petitions`,      lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/issues/submit`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...issueUrls,
    ...petitionUrls,
  ];
}
