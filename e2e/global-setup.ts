/**
 * Playwright global setup for HD2 Council E2E tests.
 *
 * Uses the pg package directly (raw SQL) to avoid Prisma CJS/ESM conflicts in
 * Playwright's TypeScript transform. Seeds all data with parameterised queries.
 *
 * Creates:
 *   - Community org (hd2-community-1)
 *   - Admin person (admin@example.com) + session → .admin-state.json
 *   - Citizen person + session → .citizen-state.json
 *   - Fresh test cycle in "pending" status
 *   - One pre-approved issue with 5 seed votes (qualifies for petition)
 */

import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { randomUUID } from "crypto";

// Use CommonJS require so the `pg` package resolves from node_modules without ESM import.meta.url.
const req = createRequire(path.resolve(__dirname, "../package.json"));
const { Client } = req("pg") as typeof import("pg");

const DB_URL        = "postgresql://platform:platform@localhost:5433/platform_test";
const ADMIN_STATE   = path.resolve(process.cwd(), ".admin-state.json");
const CITIZEN_STATE = path.resolve(process.cwd(), ".citizen-state.json");
const SESSION_COOKIE   = "hd2_session";
const ADMIN_EMAIL      = "admin@example.com";
const CITIZEN_EMAIL    = "e2e-citizen@test.local";
const COMMUNITY_ORG_ID = "hd2-community-1";
export const E2E_CYCLE_ID = "hd2-e2e-cycle";
export const E2E_ISSUE_ID = "hd2-e2e-preseeded-issue";

export default async function globalSetup() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── Wipe previous test cycle data (FK-safe order) ────────────────────────
  await client.query(`
    DELETE FROM "Vote"
    WHERE "motionId" IN (
      SELECT m.id FROM "Motion" m
      JOIN "AgendaItem" a ON a.id = m."agendaItemId"
      WHERE a."meetingId" = $1
    )
  `, [E2E_CYCLE_ID]);

  await client.query(`
    DELETE FROM "Motion"
    WHERE "agendaItemId" IN (
      SELECT id FROM "AgendaItem" WHERE "meetingId" = $1
    )
  `, [E2E_CYCLE_ID]);

  await client.query(`DELETE FROM "AgendaItem" WHERE "meetingId" = $1`, [E2E_CYCLE_ID]);
  await client.query(`DELETE FROM "Artifact"   WHERE "meetingId" = $1`, [E2E_CYCLE_ID]);
  await client.query(`DELETE FROM "Meeting"    WHERE id = $1`,           [E2E_CYCLE_ID]);

  // ── Org ──────────────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO "Organisation" (id, name, "orgType", jurisdiction, "legalForm", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO NOTHING
  `, [COMMUNITY_ORG_ID, "Helldivers 2 Community", "community", "GLOBAL", "informal", now]);

  // ── People ───────────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO "Person" (id, name, email, "createdAt")
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO NOTHING
  `, [randomUUID(), "E2E Admin", ADMIN_EMAIL, now]);

  await client.query(`
    INSERT INTO "Person" (id, name, email, "createdAt")
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO NOTHING
  `, [randomUUID(), "E2E Citizen", CITIZEN_EMAIL, now]);

  // Fetch IDs (in case they already existed)
  const adminRow   = (await client.query(`SELECT id FROM "Person" WHERE email = $1`, [ADMIN_EMAIL])).rows[0] as { id: string };
  const citizenRow = (await client.query(`SELECT id FROM "Person" WHERE email = $1`, [CITIZEN_EMAIL])).rows[0] as { id: string };

  // ── Sessions ─────────────────────────────────────────────────────────────
  const adminSessionId   = randomUUID();
  const citizenSessionId = randomUUID();

  await client.query(`
    INSERT INTO "PersonSession" (id, "personId", "expiresAt", "createdAt")
    VALUES ($1, $2, $3, $4)
  `, [adminSessionId, adminRow.id, expiresAt, now]);

  await client.query(`
    INSERT INTO "PersonSession" (id, "personId", "expiresAt", "createdAt")
    VALUES ($1, $2, $3, $4)
  `, [citizenSessionId, citizenRow.id, expiresAt, now]);

  // ── Test cycle ───────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO "Meeting" (id, "organisationId", "meetingType", title, date, status, "quorumAchieved", version, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [E2E_CYCLE_ID, COMMUNITY_ORG_ID, "council", "E2E Test Cycle", now, "pending", false, 1, now, now]);

  await client.query(`
    INSERT INTO "Artifact" (id, "meetingId", name, "mimeType", description, "uploadedAt")
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    randomUUID(),
    E2E_CYCLE_ID,
    "Cycle State — E2E Test Cycle",
    "application/x-cycle-state",
    JSON.stringify({ submissionOpenedAt: now }),
    now,
  ]);

  // ── Pre-approved issue with 5 seed votes ────────────────────────────────
  await client.query(`
    INSERT INTO "AgendaItem" (id, "meetingId", "orderIndex", title, description, category, "requiresResolution")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    E2E_ISSUE_ID,
    E2E_CYCLE_ID,
    999,
    "Railgun Safe Mode still unviable after 2024 nerf",
    "Safe Mode AP was reduced and never compensated. Used for E2E vote + petition tests.",
    "decision",
    true,
  ]);

  const motionId = randomUUID();
  await client.query(`
    INSERT INTO "Motion" (id, "agendaItemId", "motionText", "motionType", "resolutionType", outcome, "votesFor", "specialNotes", "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    motionId,
    E2E_ISSUE_ID,
    "That this issue be accepted into the voting cycle.",
    "ordinary",
    "balance",
    "passed",
    5,
    JSON.stringify({ submitterEmail: "seed@test.local", proposedChange: "Restore safe mode AP." }),
    now,
  ]);

  // 5 seed votes
  for (let i = 0; i < 5; i++) {
    const voterEmail = `e2e-voter-${i}@test.local`;
    await client.query(`
      INSERT INTO "Person" (id, name, email, "createdAt")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, [randomUUID(), `Seed Voter ${i}`, voterEmail, now]);

    const voterRow = (await client.query(`SELECT id FROM "Person" WHERE email = $1`, [voterEmail])).rows[0] as { id: string };

    await client.query(`
      INSERT INTO "Vote" (id, "motionId", "voterId", choice, "voteMethod")
      VALUES ($1, $2, $3, $4, $5)
    `, [randomUUID(), motionId, voterRow.id, "for", "online"]);
  }

  await client.end();

  // ── Write browser auth state files ───────────────────────────────────────
  function writeAuthState(filePath: string, sessionId: string) {
    const expiresUnix = Math.floor(new Date(expiresAt).getTime() / 1000);
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          cookies: [{
            name: SESSION_COOKIE,
            value: sessionId,
            domain: "localhost",
            path: "/",
            expires: expiresUnix,
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
          }],
          origins: [],
        },
        null, 2
      )
    );
  }

  writeAuthState(ADMIN_STATE, adminSessionId);
  writeAuthState(CITIZEN_STATE, citizenSessionId);
}
