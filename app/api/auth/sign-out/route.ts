import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, deleteSession, sessionCookieOptions } from "@/lib/session";

export async function POST(req: NextRequest) {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  const response = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
