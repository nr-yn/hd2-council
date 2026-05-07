/**
 * Integration tests for the Governance Brain — hit real Gemma at LM Studio.
 * Run explicitly: npx vitest run app/api/__tests__/governance-brain.integration.test.ts
 * Not included in the regular vitest run (excluded via vitest.config pattern).
 */
import { describe, it, expect } from "vitest";
import { evaluateAmendment } from "@/lib/governance-brain";

describe("Governance Brain — integration (real Gemma)", () => {

  it("SHOULD PASS: minor refinement with specific numbers auto-approves", async () => {

    // Original is vague about magnitude; amendment adds a specific value — clear refinement
    const result = await evaluateAmendment(
      "Reduce Railgun safe mode damage and increase its charge time to address overperformance.",
      "Reduce safe mode damage by 12% and set charge time to 2.2s — keeps it viable but addressed."
    );

    console.log("PASS case result:", JSON.stringify(result, null, 2));

    expect(result.verdict).toBe("auto-approve");
    expect(result.synthesized).toBeTruthy();
    expect(result.synthesized!.length).toBeGreaterThan(20);
  }, 30_000);

  it("SHOULD FAIL: amendment reverses the proposal intent", async () => {
    // Original proposes a nerf; amendment argues for a buff instead — opposite intent
    const result = await evaluateAmendment(
      "Reduce Railgun safe mode damage by 15% and increase charge time to 2.5s.",
      "This nerf is wrong — buff the Railgun instead: increase safe mode damage by 20% and reduce charge time to 1.5s."
    );

    console.log("FAIL case result:", JSON.stringify(result, null, 2));

    expect(result.verdict).toBe("flag");
    expect(result.synthesized).toBeNull();
  }, 30_000);

});

describe("Governance Brain — integration: word overlap pre-filter (no LM call)", () => {

  it("SHOULD FAIL: completely off-topic amendment is caught before calling brain", async () => {
    // Tracks a different weapon entirely — near-zero word overlap
    const result = await evaluateAmendment(
      "Reduce Railgun safe mode damage by 15% and increase charge time to 2.5s.",
      "The Autocannon needs a bigger magazine. Increase it from 10 to 15 rounds per clip for better sustained fire."
    );

    console.log("Off-topic pre-filter result:", JSON.stringify(result, null, 2));

    expect(result.verdict).toBe("flag");
    expect(result.reason).toMatch(/15%|word|overlap/i);
    expect(result.synthesized).toBeNull();
  }, 5_000); // fast — no network call

});
