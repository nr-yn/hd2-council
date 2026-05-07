import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { evaluateAmendment } from "@/lib/governance-brain";

function mockBrainResponse(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

const ORIGINAL = "Reduce Railgun safe mode damage by 15% and increase charge time to 2.5s.";
const AMENDMENT = "Reduce safe mode damage by 10% instead — 15% is too harsh — and keep charge time at 2s.";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("evaluateAmendment — word overlap pre-filter", () => {
  it("flags immediately when word overlap is below 15% without calling the brain", async () => {
    const result = await evaluateAmendment(
      "Nerf the railgun safe mode damage output by fifteen percent.",
      "Buff the autocannon spread and increase magazine capacity for all support weapons."
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.verdict).toBe("flag");
    expect(result.synthesized).toBeNull();
    expect(result.reason).toMatch(/15%/i);
  });

  it("calls the brain when overlap is sufficient", async () => {
    mockBrainResponse({
      choices: [{ message: { content: '{"verdict":"auto-approve","reason":"minor refinement","synthesized":"Reduce safe mode damage by 10% and keep charge time at 2s."}' } }],
    });

    await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

describe("evaluateAmendment — happy path", () => {
  it("returns auto-approve with synthesized text", async () => {
    mockBrainResponse({
      choices: [{ message: { content: '{"verdict":"auto-approve","reason":"minor refinement","synthesized":"Reduce safe mode damage by 10% and keep charge time at 2s."}' } }],
    });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);

    expect(result.verdict).toBe("auto-approve");
    expect(result.reason).toBe("minor refinement");
    expect(result.synthesized).toBe("Reduce safe mode damage by 10% and keep charge time at 2s.");
  });

  it("returns flag with null synthesized", async () => {
    mockBrainResponse({
      choices: [{ message: { content: '{"verdict":"flag","reason":"reverses core nerf intent","synthesized":null}' } }],
    });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);

    expect(result.verdict).toBe("flag");
    expect(result.reason).toBe("reverses core nerf intent");
    expect(result.synthesized).toBeNull();
  });
});

describe("evaluateAmendment — markdown fence stripping", () => {
  it("parses response wrapped in ```json fences", async () => {
    mockBrainResponse({
      choices: [{ message: { content: '```json\n{"verdict":"auto-approve","reason":"ok","synthesized":"Synthesized text."}\n```' } }],
    });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(result.verdict).toBe("auto-approve");
    expect(result.synthesized).toBe("Synthesized text.");
  });

  it("parses response wrapped in plain ``` fences", async () => {
    mockBrainResponse({
      choices: [{ message: { content: '```\n{"verdict":"flag","reason":"bad","synthesized":null}\n```' } }],
    });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(result.verdict).toBe("flag");
  });
});

describe("evaluateAmendment — synthesized text truncation", () => {
  it("truncates synthesized text to 400 characters", async () => {
    const longText = "A".repeat(500);
    mockBrainResponse({
      choices: [{ message: { content: JSON.stringify({ verdict: "auto-approve", reason: "ok", synthesized: longText }) } }],
    });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(result.synthesized).toHaveLength(400);
  });

  it("does not truncate synthesized text under 400 characters", async () => {
    const shortText = "Short synthesized text.";
    mockBrainResponse({
      choices: [{ message: { content: JSON.stringify({ verdict: "auto-approve", reason: "ok", synthesized: shortText }) } }],
    });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(result.synthesized).toBe(shortText);
  });
});

describe("evaluateAmendment — fail-safe on error", () => {
  it("flags when fetch throws (brain unreachable)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(result.verdict).toBe("flag");
    expect(result.synthesized).toBeNull();
    expect(result.reason).toMatch(/unavailable/i);
  });

  it("flags when brain returns non-OK status", async () => {
    mockBrainResponse({}, 503);

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(result.verdict).toBe("flag");
  });

  it("flags when response JSON is malformed", async () => {
    mockBrainResponse({
      choices: [{ message: { content: "I cannot help with that." } }],
    });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(result.verdict).toBe("flag");
  });

  it("flags when verdict field has unexpected value", async () => {
    mockBrainResponse({
      choices: [{ message: { content: '{"verdict":"maybe","reason":"unsure","synthesized":null}' } }],
    });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(result.verdict).toBe("flag");
  });

  it("flags when choices array is empty", async () => {
    mockBrainResponse({ choices: [] });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    expect(result.verdict).toBe("flag");
  });

  it("flags when synthesized is null on auto-approve verdict", async () => {
    mockBrainResponse({
      choices: [{ message: { content: '{"verdict":"auto-approve","reason":"ok","synthesized":null}' } }],
    });

    const result = await evaluateAmendment(ORIGINAL, AMENDMENT);
    // synthesized must be null when the model returns null even if verdict is auto-approve
    expect(result.synthesized).toBeNull();
  });
});
