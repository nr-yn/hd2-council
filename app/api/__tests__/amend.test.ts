import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nryn/db", () => ({
  prisma: {
    agendaItem: {
      findUnique: vi.fn(),
    },
    motion: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

import { prisma } from "@nryn/db";
import { getSession } from "@/lib/session";
import { POST } from "@/app/api/issues/[id]/amend/route";
import { NextRequest } from "next/server";

const mockGetSession = vi.mocked(getSession);
const mockFindUnique = vi.mocked(prisma.agendaItem.findUnique);
const mockMotionCreate = vi.mocked(prisma.motion.create);

const CITIZEN_SESSION = {
  personId: "person-1",
  person: { email: "citizen@test.local" },
};

const APPROVED_ISSUE = {
  id: "issue-1",
  meeting: { status: "voting" },
  motions: [
    {
      id: "motion-1",
      motionType: "ordinary",
      outcome: "passed",
    },
  ],
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/issues/issue-1/amend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/issues/[id]/amend", () => {
  it("returns 401 when not signed in", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(makeRequest({ proposedChange: "fix it" }), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/sign in/i);
  });

  it("returns 400 when proposedChange is missing", async () => {
    mockGetSession.mockResolvedValue(CITIZEN_SESSION as never);
    mockFindUnique.mockResolvedValue(APPROVED_ISSUE as never);

    const res = await POST(makeRequest({}), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when proposedChange is only whitespace", async () => {
    mockGetSession.mockResolvedValue(CITIZEN_SESSION as never);
    mockFindUnique.mockResolvedValue(APPROVED_ISSUE as never);

    const res = await POST(makeRequest({ proposedChange: "   " }), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when proposedChange exceeds 600 chars", async () => {
    mockGetSession.mockResolvedValue(CITIZEN_SESSION as never);
    mockFindUnique.mockResolvedValue(APPROVED_ISSUE as never);

    const res = await POST(makeRequest({ proposedChange: "x".repeat(601) }), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 when issue does not exist", async () => {
    mockGetSession.mockResolvedValue(CITIZEN_SESSION as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ proposedChange: "fix it" }), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 403 when cycle is in pending phase", async () => {
    mockGetSession.mockResolvedValue(CITIZEN_SESSION as never);
    mockFindUnique.mockResolvedValue({
      ...APPROVED_ISSUE,
      meeting: { status: "pending" },
    } as never);

    const res = await POST(makeRequest({ proposedChange: "fix it" }), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/voting phase/i);
  });

  it("returns 403 when voting has closed", async () => {
    mockGetSession.mockResolvedValue(CITIZEN_SESSION as never);
    mockFindUnique.mockResolvedValue({
      ...APPROVED_ISSUE,
      meeting: { status: "drafting" },
    } as never);

    const res = await POST(makeRequest({ proposedChange: "fix it" }), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/closed/i);
  });

  it("returns 400 when issue has no passed main motion", async () => {
    mockGetSession.mockResolvedValue(CITIZEN_SESSION as never);
    mockFindUnique.mockResolvedValue({
      ...APPROVED_ISSUE,
      motions: [{ id: "motion-1", motionType: "ordinary", outcome: "pending" }],
    } as never);

    const res = await POST(makeRequest({ proposedChange: "fix it" }), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/approved/i);
  });

  it("creates amendment motion and returns 200 on happy path", async () => {
    mockGetSession.mockResolvedValue(CITIZEN_SESSION as never);
    mockFindUnique.mockResolvedValue(APPROVED_ISSUE as never);
    mockMotionCreate.mockResolvedValue({ id: "amendment-1" } as never);

    const res = await POST(makeRequest({ proposedChange: "Restore AP to pre-2024 levels." }), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { amendmentId: string };
    expect(body.amendmentId).toBe("amendment-1");

    expect(mockMotionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          motionType: "amendment",
          outcome: null,
          agendaItemId: "issue-1",
        }),
      })
    );
  });

  it("stores submitterEmail and proposedChange in specialNotes", async () => {
    mockGetSession.mockResolvedValue(CITIZEN_SESSION as never);
    mockFindUnique.mockResolvedValue(APPROVED_ISSUE as never);
    mockMotionCreate.mockResolvedValue({ id: "amendment-1" } as never);

    await POST(makeRequest({ proposedChange: "Restore AP." }), {
      params: Promise.resolve({ id: "issue-1" }),
    });

    const call = mockMotionCreate.mock.calls[0][0];
    const notes = JSON.parse((call as { data: { specialNotes: string } }).data.specialNotes);
    expect(notes.submitterEmail).toBe("citizen@test.local");
    expect(notes.proposedChange).toBe("Restore AP.");
  });
});
