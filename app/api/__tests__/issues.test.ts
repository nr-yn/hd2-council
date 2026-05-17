import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nr-yn/db", () => ({
  prisma: {
    agendaItem: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    motion: {
      create: vi.fn(),
    },
    person: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/cycle", () => ({
  getOrCreateOpenCycle: vi.fn(),
}));

import { prisma } from "@nr-yn/db";
import { getOrCreateOpenCycle } from "@/lib/cycle";
import { isSpam } from "@/lib/spam-filter";
import { POST } from "@/app/api/issues/route";

beforeEach(() => vi.clearAllMocks());

// ─── Spam filter unit tests ───────────────────────────────────────────────────

describe("isSpam", () => {
  it("returns true when title contains a URL", () => {
    expect(isSpam("https://example.com buy stuff", "this is a valid long description with words")).toBe(true);
  });

  it("returns true when description contains a URL", () => {
    expect(isSpam("Railgun balance issue", "check out http://example.com for the fix please")).toBe(true);
  });

  it("returns true for 'buy now' phrase", () => {
    expect(isSpam("buy now amazing deal", "this is a totally valid description with enough words")).toBe(true);
  });

  it("returns true for 9+ repeated chars", () => {
    expect(isSpam("aaaaaaaaa balance fix needed", "the railgun damage is way too high in the current patch")).toBe(true);
  });

  it("returns true when title is less than 8 chars", () => {
    expect(isSpam("short", "the railgun damage is way too high in the current patch")).toBe(true);
  });

  it("returns true when description has fewer than 5 words", () => {
    expect(isSpam("Railgun balance issue nerf", "too strong")).toBe(true);
  });

  it("returns false for a clean HD2 issue", () => {
    expect(
      isSpam(
        "Railgun needs balance pass",
        "The railgun one-shots medium enemies too reliably at all ranges making other primaries obsolete"
      )
    ).toBe(false);
  });
});

// ─── Route integration tests ──────────────────────────────────────────────────

const VALID_BODY = {
  email: "divers@example.com",
  title: "Railgun balance pass needed",
  category: "balance",
  description: "The railgun one-shots medium enemies too reliably at all ranges making other primaries obsolete",
};

function makePendingCycle() {
  return { id: "cycle-1", status: "pending" };
}

function setupDefaultMocks() {
  vi.mocked(getOrCreateOpenCycle).mockResolvedValue(makePendingCycle() as never);
  vi.mocked(prisma.agendaItem.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.agendaItem.count).mockResolvedValue(0 as never);
  vi.mocked(prisma.person.findUnique).mockResolvedValue(null as never);
  vi.mocked(prisma.person.create).mockResolvedValue({
    id: "p-1",
    name: "divers",
    email: "divers@example.com",
  } as never);
  vi.mocked(prisma.agendaItem.create).mockResolvedValue({ id: "item-1" } as never);
  vi.mocked(prisma.motion.create).mockResolvedValue({} as never);
}

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/issues", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/issues", () => {
  it("valid clean submission creates motion with outcome: null", async () => {
    setupDefaultMocks();

    const res = await POST(makeReq(VALID_BODY) as never);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.issueId).toBe("item-1");
    expect(prisma.motion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ outcome: null }) })
    );
  });

  it("spam submission (URL in title) creates motion with outcome: 'failed'", async () => {
    setupDefaultMocks();

    const res = await POST(
      makeReq({
        ...VALID_BODY,
        title: "https://spam.com best deal now",
      }) as never
    );

    expect(res.status).toBe(201);
    expect(prisma.motion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ outcome: "failed" }) })
    );
  });

  it("returns 400 when email is missing", async () => {
    setupDefaultMocks();
    const { email: _email, ...noEmail } = VALID_BODY;
    const res = await POST(makeReq(noEmail) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when title is missing", async () => {
    setupDefaultMocks();
    const { title: _title, ...noTitle } = VALID_BODY;
    const res = await POST(makeReq(noTitle) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/title/i);
  });

  it("returns 400 when category is invalid", async () => {
    setupDefaultMocks();
    const res = await POST(makeReq({ ...VALID_BODY, category: "nonsense" }) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/category/i);
  });

  it("returns 403 when cycle status is 'voting'", async () => {
    vi.mocked(getOrCreateOpenCycle).mockResolvedValue({ id: "cycle-1", status: "voting" } as never);

    const res = await POST(makeReq(VALID_BODY) as never);
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.mocked(getOrCreateOpenCycle).mockResolvedValue(makePendingCycle() as never);

    // findMany returns 3 items each with a matching motion → priorSubmissions = 3
    const mockedItems = [
      { id: "ai-1", motions: [{ id: "m-1" }] },
      { id: "ai-2", motions: [{ id: "m-2" }] },
      { id: "ai-3", motions: [{ id: "m-3" }] },
    ];
    vi.mocked(prisma.agendaItem.findMany).mockResolvedValue(mockedItems as never);

    const res = await POST(makeReq(VALID_BODY) as never);
    expect(res.status).toBe(429);
  });
});
