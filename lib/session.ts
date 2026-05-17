/**
 * Session management for HD2 Council.
 *
 * Sessions are stored as rows in PersonSession.
 * The session ID is stored as a plain httpOnly cookie (hd2_session).
 * Full DB validation happens on every request via getSession() / requireSession().
 * Middleware does a lightweight cookie-presence check only (no DB access).
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@nryn/db";

export const SESSION_COOKIE = "hd2_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type SessionUser = { id: string; name: string; email: string | null };
export type Session = { id: string; personId: string; person: SessionUser };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const row = await prisma.personSession.findUnique({
    where: { id },
    include: { person: { select: { id: true, name: true, email: true } } },
  });

  if (!row || row.expiresAt < new Date()) return null;
  return { id: row.id, personId: row.personId, person: row.person };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in");
  return session;
}

/** Creates a new PersonSession row and returns the session ID. */
export async function createSession(personId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
  const row = await prisma.personSession.create({ data: { personId, expiresAt } });
  return row.id;
}

/** Deletes the session row for the given ID. */
export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.personSession.delete({ where: { id: sessionId } }).catch(() => {});
}

/** Cookie options shared between set and delete operations. */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
};
