const BRAIN_URL = process.env.GOVERNANCE_BRAIN_URL ?? "http://192.168.1.106:1234";
const BRAIN_MODEL = process.env.GOVERNANCE_BRAIN_MODEL ?? "google/gemma-4-e2b";
const BRAIN_TIMEOUT_MS = 45_000;

export type BrainVerdict = {
  verdict: "auto-approve" | "flag";
  reason: string;
  synthesized: string | null;
};

// Jaccard word-overlap: below 0.15 means almost no shared vocabulary → instant flag
function wordOverlap(a: string, b: string): number {
  const words = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter(Boolean));
  const wa = words(a);
  const wb = words(b);
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 1 : intersection / union;
}

export async function evaluateAmendment(
  originalProposedChange: string,
  amendmentText: string
): Promise<BrainVerdict> {
  // Pre-filter: less than 15% word overlap means it's a near-total rewrite
  if (wordOverlap(originalProposedChange, amendmentText) < 0.15) {
    return {
      verdict: "flag",
      reason: "Amendment shares fewer than 15% of words with original — likely a major rewrite or off-topic submission.",
      synthesized: null,
    };
  }

  const prompt = `You are a moderation assistant for a community game governance platform. Players propose game balance changes and the community can submit amendments to refine them.

ORIGINAL PROPOSED CHANGE:
${originalProposedChange}

SUBMITTED AMENDMENT:
${amendmentText}

Evaluate this amendment and decide: should it be auto-approved (minor refinement) or flagged for human review?

AUTO-APPROVE if it:
- Adds specific numbers, timings, or mechanics to a vague proposal
- Clarifies or refines without reversing core intent
- Is a small, complementary addition

FLAG if it:
- Substantially rewrites or reverses the original
- Introduces unrelated content or game elements
- Appears manipulative, adversarial, or bad faith
- Changes more than ~40% of the core substance

If auto-approving, write a synthesized proposed change that merges the amendment's intent cleanly into the original (keep under 400 characters, specific and actionable).

Respond ONLY with valid JSON, no markdown, no other text:
{"verdict":"auto-approve","reason":"<brief>","synthesized":"<merged text>"}
or
{"verdict":"flag","reason":"<brief>","synthesized":null}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BRAIN_TIMEOUT_MS);

    const res = await fetch(`${BRAIN_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: BRAIN_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Brain returned ${res.status}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Strip markdown code fences if model wraps response
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned) as {
      verdict: string;
      reason: string;
      synthesized: string | null;
    };

    if (parsed.verdict !== "auto-approve" && parsed.verdict !== "flag") {
      throw new Error("Unexpected verdict value");
    }

    return {
      verdict: parsed.verdict,
      reason: typeof parsed.reason === "string" ? parsed.reason : "No reason provided.",
      synthesized: parsed.verdict === "auto-approve" && typeof parsed.synthesized === "string"
        ? parsed.synthesized.slice(0, 400)
        : null,
    };
  } catch {
    // Fail safe: if brain is unavailable or returns garbage, require human review
    return {
      verdict: "flag",
      reason: "Governance Brain unavailable — flagged for manual review.",
      synthesized: null,
    };
  }
}
