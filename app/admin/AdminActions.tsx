"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminActionsProps =
  | { type: "issue"; issueId: string }
  | { type: "cycle"; cycleId: string; cyclePhase: string };

export default function AdminActions(props: AdminActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function post(url: string, body?: object) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Action failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (props.type === "issue") {
    return (
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <button
          onClick={() => post(`/api/admin/issues/${props.issueId}/approve`, { action: "approve" })}
          disabled={loading}
          className="display text-xs tracking-widest px-3 py-1.5 transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ backgroundColor: "var(--se-green)", color: "var(--se-black)", letterSpacing: ".2em", fontSize: "10px" }}
        >
          APPROVE
        </button>
        <button
          onClick={() => post(`/api/admin/issues/${props.issueId}/approve`, { action: "reject" })}
          disabled={loading}
          className="display text-xs tracking-widest px-3 py-1.5 transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ border: "1px solid var(--se-red)", color: "var(--se-red)", letterSpacing: ".2em", fontSize: "10px" }}
        >
          REJECT
        </button>
        {error && <span className="text-xs" style={{ color: "var(--se-red)" }}>{error}</span>}
      </div>
    );
  }

  // cycle — phase-conditional buttons
  const { cyclePhase } = props;

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      {cyclePhase === "pending" && (
        <button
          onClick={() => post("/api/admin/cycles/advance")}
          disabled={loading}
          className="display text-xs tracking-widest px-4 py-2 transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ backgroundColor: "var(--se-green)", color: "var(--se-black)", letterSpacing: ".2em", fontSize: "11px" }}
        >
          {loading ? "ADVANCING..." : "OPEN VOTING →"}
        </button>
      )}
      {cyclePhase === "voting" && (
        <button
          onClick={() => post("/api/admin/cycles/advance")}
          disabled={loading}
          className="display text-xs tracking-widest px-4 py-2 transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ backgroundColor: "var(--se-blue)", color: "var(--se-black)", letterSpacing: ".2em", fontSize: "11px" }}
        >
          {loading ? "ADVANCING..." : "OPEN DRAFTING →"}
        </button>
      )}
      {cyclePhase === "drafting" && (
        <button
          onClick={() => post("/api/admin/cycles/close")}
          disabled={loading}
          className="display text-xs tracking-widest px-4 py-2 transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ backgroundColor: "var(--se-amber)", color: "var(--se-black)", letterSpacing: ".2em", fontSize: "11px" }}
        >
          {loading ? "PUBLISHING..." : "CLOSE CYCLE & PUBLISH"}
        </button>
      )}
      {error && <span className="text-xs" style={{ color: "var(--se-red)" }}>{error}</span>}
    </div>
  );
}
