import { prisma } from "@platform/db";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  const fail = (error: string) => {
    const u = new URL("/auth/sign-in", req.nextUrl.origin);
    u.searchParams.set("error", error);
    return NextResponse.redirect(u);
  };

  if (!token) return fail("missing_token");

  const record = await prisma.magicLinkToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) return fail("invalid_link");

  // Upsert person by email
  let person = await prisma.person.findUnique({ where: { email: record.email } });
  if (!person) {
    person = await prisma.person.create({
      data: { name: record.email.split("@")[0], email: record.email },
    });
  }

  const [sessionId] = await Promise.all([
    createSession(person.id),
    prisma.magicLinkToken.update({ where: { token }, data: { used: true } }),
  ]);

  const response = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  response.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions);
  return response;
}
