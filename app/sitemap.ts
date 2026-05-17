import type { MetadataRoute } from "next";
import { prisma } from "@nryn/db";

export const dynamic = "force-dynamic";

const BASE = "https://democracy.quorate.cc";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [approvedItems, pendingItems, petitions] = await Promise.all([
    prisma.agendaItem.findMany({
      where: { motions: { some: { outcome: "passed" } } },
      select: { id: true },
    }),
    prisma.agendaItem.findMany({
      where: { motions: { none: { outcome: "passed" } } },
      select: { id: true },
    }),
    prisma.artifact.findMany({
      where: { mimeType: "text/markdown" },
      select: { id: true, uploadedAt: true, description: true },
    }),
  ]);

  const now = new Date();
  const issueUrls: MetadataRoute.Sitemap = [
    ...approvedItems.map((item) => ({
      url: `${BASE}/issues/${item.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...pendingItems.map((item) => ({
      url: `${BASE}/issues/${item.id}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];

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

  const categoryUrls: MetadataRoute.Sitemap = ["balance", "bug", "qol", "content"].map((cat) => ({
    url: `${BASE}/issues/category/${cat}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [
    { url: BASE,                     lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/issues`,         lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/petitions`,      lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },

    ...categoryUrls,
    ...issueUrls,
    ...petitionUrls,
  ];
}
