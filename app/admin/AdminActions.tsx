"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminActionsProps =
  | { type: "issue"; issueId: string; currentTitle: string }
  | { type: "cycle"; cycleId: string; cyclePhase: string };

export default function AdminActions(props: AdminActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(props.type === "issue" ? props.currentTitle : "");
  const [titleSaved, setTitleSaved] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);

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

  async function saveTitle(issueId: string) {
    if (!title.trim()) return;
    setTitleSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/issues/${issueId}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Save failed");
        return;
      }
      setTitleSaved(true);
      setTimeout(() => setTitleSaved(false), 2000);
    } catch {
      setError("Network error");
    } finally {
      setTitleSaving(false);
    }
  }

  if (props.type === "issue") {
    const isDirty = title.trim() !== props.currentTitle;
    return (
      <div className="flex flex-col gap-2 shrink-0" style={{ minWidth: "220px", maxWidth: "260px" }}>
        {/* Inline title editor */}
        <div>
          <p className="display mb-1" style={{ color: "var(--se-hint)", fontSize: "9px", letterSpacing: ".2em" }}>
            EDIT TITLE FOR SEO
          </p>
          <div className="flex gap-1">
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value.slice(0, 120)); setTitleSaved(false); }}
              maxLength={120}
              style={{
                flex: 1,
                padding: "5px 8px",
                fontSize: "11px",
                backgroundColor: "var(--se-black)",
                border: `1px solid ${isDirty ? "var(--se-amber)" : "var(--se-gold-dim)"}`,
                color: "var(--se-text)",
                fontFamily: "var(--font-mono, monospace)",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              onClick={() => saveTitle(props.issueId)}
              disabled={!isDirty || titleSaving}
              className="display text-xs px-2 transition-opacity disabled:opacity-30"
              style={{ backgroundColor: "var(--se-amber)", color: "var(--se-black)", fontSize: "9px", letterSpacing: ".15em", whiteSpace: "nowrap" }}
            >
              {titleSaving ? "…" : titleSaved ? "✓" : "SAVE"}
            </button>
          </div>
          <p style={{ color: "var(--se-hint)", fontSize: "9px", marginTop: "2px" }}>
            {title.length}/120 — include weapon/mechanic name
          </p>
        </div>

        {/* Approve / Reject */}
        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
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
