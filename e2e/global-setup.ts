/**
 * Playwright global setup for HD2 Council E2E tests.
 *
 * Uses better-sqlite3 directly to avoid Prisma CJS/ESM conflicts in Playwright's
 * TypeScript transform. Seeds all data with raw SQL.
 *
 * Creates:
 *   - Community org (hd2-community-1)
 *   - Admin person (admin@example.com) + session → .admin-state.json
 *   - Citizen person + session → .citizen-state.json
 *   - Fresh test cycle in "pending" status
 *   - One pre-approved issue with 5 seed votes (qualifies for petition)
 */

import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { randomUUID } from "crypto";

// Resolve better-sqlite3 from the db package (which declares it as a dependency)
const req = createRequire(path.resolve(__dirname, "../../../packages/db/package.json"));
const Database = req("better-sqlite3") as typeof import("better-sqlite3");

// DB lives in e2e/test.db; auth state files are resolved by Playwright relative to process.cwd() (app root)
const DB_PATH       = path.resolve(__dirname, "test.db");
const ADMIN_STATE   = path.resolve(process.cwd(), ".admin-state.json");
const CITIZEN_STATE = path.resolve(process.cwd(), ".citizen-state.json");
const SESSION_COOKIE   = "hd2_session";
const ADMIN_EMAIL      = "admin@example.com";
const CITIZEN_EMAIL    = "e2e-citizen@test.local";
const COMMUNITY_ORG_ID = "hd2-community-1";
export const E2E_CYCLE_ID = "hd2-e2e-cycle";
export const E2E_ISSUE_ID = "hd2-e2e-preseeded-issue";

export default async function globalSetup() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = OFF"); // off during seed to avoid FK ordering issues

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── Wipe previous test cycle data (FK-safe order) ────────────────────────
  db.exec(`
    DELETE FROM Vote       WHERE motionId IN (SELECT m.id FROM Motion m JOIN AgendaItem a ON a.id = m.agendaItemId WHERE a.meetingId = '${E2E_CYCLE_ID}');
    DELETE FROM Motion     WHERE agendaItemId IN (SELECT id FROM AgendaItem WHERE meetingId = '${E2E_CYCLE_ID}');
    DELETE FROM AgendaItem WHERE meetingId = '${E2E_CYCLE_ID}';
    DELETE FROM Artifact   WHERE meetingId = '${E2E_CYCLE_ID}';
    DELETE FROM Meeting    WHERE id = '${E2E_CYCLE_ID}';
  `);

  // ── Org ──────────────────────────────────────────────────────────────────
  db.prepare(`
    INSERT OR IGNORE INTO Organisation (id, name, orgType, jurisdiction, legalForm, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(COMMUNITY_ORG_ID, "Helldivers 2 Community", "community", "GLOBAL", "informal", now);

  // ── People ───────────────────────────────────────────────────────────────
  db.prepare(`INSERT OR IGNORE INTO Person (id, name, email, createdAt) VALUES (?, ?, ?, ?)`)
    .run(randomUUID(), "E2E Admin", ADMIN_EMAIL, now);
  db.prepare(`INSERT OR IGNORE INTO Person (id, name, email, createdAt) VALUES (?, ?, ?, ?)`)
    .run(randomUUID(), "E2E Citizen", CITIZEN_EMAIL, now);

  // Fetch IDs (in case they already existed)
  const admin   = db.prepare(`SELECT id FROM Person WHERE email = ?`).get(ADMIN_EMAIL) as { id: string };
  const citizen = db.prepare(`SELECT id FROM Person WHERE email = ?`).get(CITIZEN_EMAIL) as { id: string };

  // ── Sessions ─────────────────────────────────────────────────────────────
  const adminSessionId   = randomUUID();
  const citizenSessionId = randomUUID();

  db.prepare(`INSERT INTO PersonSession (id, personId, expiresAt, createdAt) VALUES (?, ?, ?, ?)`)
    .run(adminSessionId, admin.id, expiresAt, now);
  db.prepare(`INSERT INTO PersonSession (id, personId, expiresAt, createdAt) VALUES (?, ?, ?, ?)`)
    .run(citizenSessionId, citizen.id, expiresAt, now);

  // ── Test cycle ───────────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO Meeting (id, organisationId, meetingType, title, date, status, quorumAchieved, version, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(E2E_CYCLE_ID, COMMUNITY_ORG_ID, "council", "E2E Test Cycle", now, "pending", 0, 1, now, now);

  db.prepare(`
    INSERT INTO Artifact (id, meetingId, name, mimeType, description, uploadedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    E2E_CYCLE_ID,
    "Cycle State — E2E Test Cycle",
    "application/x-cycle-state",
    JSON.stringify({ submissionOpenedAt: now }),
    now,
  );

  // ── Pre-approved issue with 5 seed votes ────────────────────────────────
  db.prepare(`
    INSERT INTO AgendaItem (id, meetingId, orderIndex, title, description, category, requiresResolution)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    E2E_ISSUE_ID,
    E2E_CYCLE_ID,
    999,
    "Railgun Safe Mode still unviable after 2024 nerf",
    "Safe Mode AP was reduced and never compensated. Used for E2E vote + petition tests.",
    "decision",
    1,
  );

  const motionId = randomUUID();
  db.prepare(`
    INSERT INTO Motion (id, agendaItemId, motionText, motionType, resolutionType, outcome, votesFor, specialNotes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    motionId,
    E2E_ISSUE_ID,
    "That this issue be accepted into the voting cycle.",
    "ordinary",
    "balance",
    "passed",
    5,
    JSON.stringify({ submitterEmail: "seed@test.local", proposedChange: "Restore safe mode AP." }),
    now,
  );

  // 5 seed votes
  for (let i = 0; i < 5; i++) {
    const voterEmail = `e2e-voter-${i}@test.local`;
    db.prepare(`INSERT OR IGNORE INTO Person (id, name, email, createdAt) VALUES (?, ?, ?, ?)`)
      .run(randomUUID(), `Seed Voter ${i}`, voterEmail, now);
    const voter = db.prepare(`SELECT id FROM Person WHERE email = ?`).get(voterEmail) as { id: string };
    db.prepare(`
      INSERT INTO Vote (id, motionId, voterId, choice, voteMethod)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), motionId, voter.id, "for", "online");
  }

  db.pragma("foreign_keys = ON");
  db.close();

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
