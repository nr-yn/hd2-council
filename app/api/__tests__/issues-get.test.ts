import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nr-yn/db", () => ({
  prisma: {
    agendaItem: { findMany: vi.fn() },
    meeting: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/cycle", () => ({
  getOpenCycle: vi.fn(),
}));

import { prisma } from "@nr-yn/db";
import { getOpenCycle } from "@/lib/cycle";
import { GET } from "@/app/api/issues/route";

const mockGetOpenCycle = vi.mocked(getOpenCycle);
const mockFindMany = vi.mocked(prisma.agendaItem.findMany);

beforeEach(() => vi.clearAllMocks());

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/issues");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url);
}

const fakeCycle = { id: "cycle-1", status: "voting", title: "Season 1" } as never;

const fakeItem = (overrides = {}) => ({
  id: "item-1",
  title: "Railgun Safe Mode nerf",
  description: "Railgun was silently nerfed",
  orderIndex: 1,
  motions: [{
    outcome: "passed",
    motionType: "ordinary",
    resolutionType: "balance",
    votesFor: 42,
    specialNotes: JSON.stringify({ submitterEmail: "a@b.com", proposedChange: "Revert it" }),
  }],
  ...overrides,
});

describe("GET /api/issues", () => {
  it("returns issues for open cycle", async () => {
    mockGetOpenCycle.mockResolvedValue(fakeCycle);
    mockFindMany.mockResolvedValue([fakeItem()] as never);

    const res = await GET(makeRequest() as never);
    const body = await res.json() as { issues: unknown[]; total: number };

    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.issues).toHaveLength(1);
  });

  it("filters stale issues out of results", async () => {
    mockGetOpenCycle.mockResolvedValue(fakeCycle);
    const staleItem = fakeItem({
      motions: [{
        outcome: "passed", motionType: "ordinary", resolutionType: "balance", votesFor: 5,
        specialNotes: JSON.stringify({ stale: true, staledAt: "2026-01-01", staledReason: "zero_votes" }),
      }],
    });
    mockFindMany.mockResolvedValue([staleItem] as never);

    const res = await GET(makeRequest() as never);
    const body = await res.json() as { issues: unknown[]; total: number };

    expect(body.total).toBe(0);
    expect(body.issues).toHaveLength(0);
  });

  it("rejects invalid category", async () => {
    mockGetOpenCycle.mockResolvedValue(fakeCycle);
    const res = await GET(makeRequest({ category: "exploit" }) as never);
    expect(res.status).toBe(400);
  });

  it("returns Cache-Control header", async () => {
    mockGetOpenCycle.mockResolvedValue(fakeCycle);
    mockFindMany.mockResolvedValue([fakeItem()] as never);
    const res = await GET(makeRequest() as never);
    expect(res.headers.get("Cache-Control")).toContain("public");
  });

  it("includes issue URL in response", async () => {
    mockGetOpenCycle.mockResolvedValue(fakeCycle);
    mockFindMany.mockResolvedValue([fakeItem()] as never);
    const res = await GET(makeRequest() as never);
    const body = await res.json() as { issues: { url: string }[] };
    expect(body.issues[0]?.url).toContain("/issues/item-1");
  });
});
