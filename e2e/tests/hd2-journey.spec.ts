/**
 * E2E: HD2 Council — full governance journey
 *
 * Sequence (must run in order — DB state carries forward):
 *   1.  [anon]   Citizen submits a valid field report
 *   2.  [anon]   Spam submission is rejected
 *   3.  [admin]  Citizen's submission shows PENDING on track page
 *   4.  [admin]  Admin approves the submitted issue
 *   5.  [admin]  Track page updates to APPROVED
 *   6.  [admin]  Admin advances cycle pending → voting
 *   7.  [citizen] Authenticated citizen upvotes the pre-seeded issue
 *   8.  [citizen] Already-voted: second upvote is blocked in UI
 *   9.  [citizen] Citizen proposes an amendment during voting phase
 *   10. [admin]  Admin advances cycle voting → drafting
 *   11. [admin]  Admin closes cycle and publishes petition
 *   12. [anon]   Petition appears on /petitions
 *   13. [anon]   Petition detail page renders petition body
 *
 * Prerequisites:
 *   DATABASE_URL="file:./e2e/test.db" pnpm --filter @platform/db migrate
 *   pnpm --filter hd2-council e2e
 */

import { test, expect, type Page } from "@playwright/test";

// Shared state threaded across describes
const state = {
  submittedIssueId: "",
  petitionId: "",
};

const PRESEEDED_ISSUE_ID = "hd2-e2e-preseeded-issue";

// ── 1–2. Anonymous citizen submissions ───────────────────────────────────────

test.describe("Anonymous citizen — submit field report", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("1. valid submission is accepted and returns a track URL", async ({ page }) => {
    await page.goto("/issues/submit");
    await expect(page.getByRole("heading", { name: /submit an issue/i })).toBeVisible();

    await page.getByLabel(/email/i).fill("divers@test.local");
    await page.getByLabel(/title/i).fill("Railgun needs balance pass after sustained nerf");
    await page.getByLabel(/description/i).fill(
      "The Railgun safe mode AP was reduced in early 2024 and has not received a compensating buff. " +
      "It now sits below the Quasar in every relevant metric while requiring a backpack slot."
    );

    await page.getByRole("button", { name: /submit/i }).click();

    // Success banner
    await expect(page.getByText(/REPORT FILED/i)).toBeVisible();

    // Capture track URL to reuse in later tests
    const trackLink = page.getByRole("link", { name: /track your report/i });
    await expect(trackLink).toBeVisible();
    const href = await trackLink.getAttribute("href");
    expect(href).toMatch(/\/issues\/track\/.+/);
    state.submittedIssueId = href!.split("/issues/track/")[1];
    expect(state.submittedIssueId).toBeTruthy();
  });

  test("2. spam submission (URL in title) is silently accepted — filtered server-side", async ({ page }) => {
    await page.goto("/issues/submit");

    await page.getByLabel(/email/i).fill("spammer@test.local");
    await page.getByLabel(/title/i).fill("https://example.com buy now free helldivers");
    await page.getByLabel(/description/i).fill("click the link for free samples");

    await page.getByRole("button", { name: /submit/i }).click();

    // Spam is silently accepted (same success UI) — stored internally with outcome "failed"
    // This prevents bots from learning what triggers the filter
    await expect(page.getByText(/REPORT FILED/i)).toBeVisible();
  });
});

// ── 3–6. Admin review + cycle advance ────────────────────────────────────────

test.describe("Admin — approve and advance", () => {
  // default storageState = .admin-state.json (set in playwright.config.ts)

  test("3. submitted issue shows PENDING on track page", async ({ page }) => {
    await page.goto(`/issues/track/${state.submittedIssueId}`);
    await expect(page.getByText(/PENDING REVIEW/i)).toBeVisible();
  });

  test("4. admin approves the submitted issue from /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/SUBMISSION PHASE/i)).toBeVisible();

    // Find the submitted issue's approve button
    const issueRow = page.locator("text=Railgun needs balance pass after sustained nerf").first();
    await expect(issueRow).toBeVisible();

    const approveBtn = page.getByRole("button", { name: /APPROVE/i }).first();
    await approveBtn.click();

    // Row should disappear from pending queue (page reloads)
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Railgun needs balance pass after sustained nerf")).not.toBeVisible();
  });

  test("5. track page now shows APPROVED", async ({ page }) => {
    await page.goto(`/issues/track/${state.submittedIssueId}`);
    await expect(page.getByText(/APPROVED — ACTIVE/i)).toBeVisible();

    // CTA link to the live issue
    await expect(page.getByRole("link", { name: /view live report/i })).toBeVisible();
  });

  test("6. admin opens voting — cycle advances to voting phase", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/SUBMISSION PHASE/i)).toBeVisible();

    await page.getByRole("button", { name: /OPEN VOTING/i }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/VOTING PHASE/i)).toBeVisible();
  });
});

// ── 7–9. Authenticated citizen — vote + amendment ────────────────────────────

test.describe("Authenticated citizen — vote and amend", () => {
  test.use({ storageState: ".citizen-state.json" });

  test("7. citizen upvotes the pre-seeded issue", async ({ page }) => {
    await page.goto(`/issues/${PRESEEDED_ISSUE_ID}`);

    // Should see the upvote button (voting phase, not yet voted)
    const voteBtn = page.getByRole("button", { name: /CAST VOICE/i });
    await expect(voteBtn).toBeVisible();

    const initialCount = await getVoteCount(page);

    await voteBtn.click();

    // Success confirmation
    await expect(page.getByText(/VOICE RECORDED/i)).toBeVisible();

    // Vote count incremented
    const updatedCount = await getVoteCount(page);
    expect(updatedCount).toBe(initialCount + 1);
  });

  test("8. second upvote attempt is blocked in UI", async ({ page }) => {
    await page.goto(`/issues/${PRESEEDED_ISSUE_ID}`);

    // After previous test cast the vote, page should show "VOICE RECORDED" state
    // (the component reads alreadyVoted server-side on page load)
    await expect(page.getByText(/VOICE RECORDED/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /CAST VOICE/i })).not.toBeVisible();
  });

  test("9. citizen submits an amendment during voting phase", { timeout: 90_000 }, async ({ page }) => {
    await page.goto(`/issues/${PRESEEDED_ISSUE_ID}`);

    // Open the amendment form (collapsed by default)
    await page.getByRole("button", { name: /propose amendment/i }).click();

    const amendmentInput = page.getByPlaceholder(/propose a change/i);
    await expect(amendmentInput).toBeVisible();

    await amendmentInput.fill(
      "Restore safe mode AP to pre-2024 levels and add a brief armour-strip effect on direct hits."
    );
    await page.getByRole("button", { name: /submit amendment/i }).click();

    await expect(page.getByText(/amendment filed/i)).toBeVisible({ timeout: 60_000 });
  });
});

// ── 10–11. Admin — close cycle ────────────────────────────────────────────────

test.describe("Admin — drafting and petition publish", () => {

  test("10. admin advances cycle to drafting phase", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/VOTING PHASE/i)).toBeVisible();

    await page.getByRole("button", { name: /OPEN DRAFTING/i }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/DRAFTING PHASE/i)).toBeVisible();
  });

  test("11. admin closes cycle and petition is published", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/DRAFTING PHASE/i)).toBeVisible();

    await page.getByRole("button", { name: /CLOSE CYCLE/i }).click();
    await page.waitForLoadState("networkidle");

    // Cycle should now show a new pending cycle (auto-created by close route)
    await expect(page.getByText(/SUBMISSION PHASE/i)).toBeVisible();
  });
});

// ── 12–13. Public — petition pages ───────────────────────────────────────────

test.describe("Public — petition pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("12. /petitions lists the published petition", async ({ page }) => {
    await page.goto("/petitions");

    // At least one petition card should appear
    const petitionLink = page.getByRole("link", { name: /helldivers 2 community petition/i }).first();
    await expect(petitionLink).toBeVisible();

    // Capture the petition ID for the next test
    const href = await petitionLink.getAttribute("href");
    expect(href).toMatch(/\/petitions\/.+/);
    state.petitionId = href!.split("/petitions/")[1];
    expect(state.petitionId).toBeTruthy();
  });

  test("13. petition detail page renders the petition body", async ({ page }) => {
    await page.goto(`/petitions/${state.petitionId}`);

    // Back navigation
    await expect(page.getByRole("link", { name: /back to petitions/i })).toBeVisible();

    // Published date banner
    await expect(page.locator("text=/Published/i")).toBeVisible();

    // The petition body has the railgun issue (5 seed votes ≥ MIN_VOTES_FOR_PETITION)
    await expect(page.getByText(/Railgun Safe Mode/i)).toBeVisible();
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getVoteCount(page: Page): Promise<number> {
  // The vote count is displayed as a large tabular number followed by "VOICES"
  const countEl = page.locator(".tabular-nums").first();
  const text = (await countEl.textContent()) ?? "0";
  return parseInt(text.replace(/[^0-9]/g, ""), 10);
}
