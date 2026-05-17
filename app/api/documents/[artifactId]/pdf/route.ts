import { prisma } from "@nr-yn/db";
import { NextRequest } from "next/server";
import { generatePDFFromMarkdown, type DocumentMeta } from "@nr-yn/documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const { artifactId } = await params;

  const artifact = await prisma.artifact.findUnique({ where: { id: artifactId } });
  if (!artifact || artifact.mimeType !== "text/markdown") {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  let meta: { body?: string; documentMeta?: DocumentMeta; publishedAt?: string } = {};
  try {
    meta = JSON.parse(artifact.description ?? "{}");
  } catch {
    return Response.json({ error: "Malformed document data" }, { status: 500 });
  }

  const body = meta.body;
  const docMeta = meta.documentMeta;

  if (!body || !docMeta) {
    return Response.json({ error: "PDF not available for this document" }, { status: 404 });
  }

  const pdf = await generatePDFFromMarkdown(body, docMeta);

  const filename = artifact.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
