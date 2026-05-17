import { prisma } from "@nryn/db";
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

const TOKEN_TTL_MINUTES = 15;

async function sendMagicLink(email: string, link: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev fallback — log to console when Resend is not configured
    console.log(`\n[auth] Magic link for ${email}:\n  ${link}\n`);
    return;
  }

  const from = process.env.EMAIL_FROM ?? "HD2 Council <noreply@hd2council.app>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "★ SUPER EARTH ACCESS GRANTED — Your Sign-In Link",
      html: `
        <div style="background:#0a0a0a;color:#e8e0cc;font-family:monospace;padding:40px;max-width:480px;margin:0 auto">
          <p style="color:#c9a227;letter-spacing:.3em;font-size:11px;margin:0 0 24px">
            ★ PRIORITY DISPATCH — SUPER EARTH MINISTRY OF TRUTH ★
          </p>
          <h1 style="color:#c9a227;letter-spacing:.06em;font-size:24px;margin:0 0 8px">
            MANAGED DEMOCRACY
          </h1>
          <p style="color:#6b7280;font-size:12px;margin:0 0 32px">
            HD2 COMMUNITY COUNCIL
          </p>
          <p style="color:#e8e0cc;font-size:13px;line-height:1.7;margin:0 0 32px">
            CITIZEN — your access request has been processed.<br>
            Click the link below to identify yourself and cast your vote for democracy.
          </p>
          <a href="${link}"
             style="display:inline-block;background:#c9a227;color:#0a0a0a;padding:14px 28px;text-decoration:none;letter-spacing:.2em;font-size:11px;font-weight:bold">
            IDENTIFY YOURSELF →
          </a>
          <p style="color:#6b7280;font-size:11px;margin:32px 0 0">
            Link expires in ${TOKEN_TTL_MINUTES} minutes.<br>
            If you did not request this, disregard. Democracy continues.
          </p>
          <p style="color:#3d3d3d;font-size:10px;letter-spacing:.2em;margin:24px 0 0">
            ★ FOR SUPER EARTH ★ LIBERTY OR DEATH ★
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) return Response.json({ error: "Email is required" }, { status: 400 });

  // Invalidate any existing unused tokens for this email
  await prisma.magicLinkToken.updateMany({
    where: { email, used: false, expiresAt: { gt: new Date() } },
    data: { used: true },
  });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);
  await prisma.magicLinkToken.create({ data: { email, token, expiresAt } });

  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3004";
  const link = `${baseUrl}/api/auth/verify?token=${token}`;

  try {
    await sendMagicLink(email, link);
  } catch (err) {
    console.error("[auth] Failed to send magic link email:", err);
    // Don't expose email errors to the client — token is created, they can retry
  }

  return Response.json({ ok: true });
}
