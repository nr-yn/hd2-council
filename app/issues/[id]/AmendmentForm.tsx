"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AmendmentForm({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/issues/${issueId}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedChange: text.trim() }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Failed to submit");
        return;
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="p-4 text-center"
        style={{ backgroundColor: "rgba(74,222,128,.04)", border: "1px solid var(--se-green)" }}
      >
        <p className="display text-xs" style={{ color: "var(--se-green)", letterSpacing: ".2em" }}>
          ✓ AMENDMENT FILED — PENDING COMMAND REVIEW
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="display text-xs tracking-widest transition-opacity hover:opacity-70"
        style={{ color: "var(--se-text-dim)", letterSpacing: ".25em", fontSize: "10px" }}
      >
        + PROPOSE AMENDMENT
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p
        className="display text-xs"
        style={{ color: "var(--se-text-faint)", letterSpacing: ".25em", fontSize: "9px" }}
      >
        PROPOSE AMENDMENT ({text.length}/600)
      </p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 600))}
        placeholder="Propose a change to this issue — specific, actionable terms…"
        rows={3}
        maxLength={600}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: "13px",
          backgroundColor: "var(--se-black)",
          border: "1px solid var(--se-gold-dim)",
          color: "var(--se-text)",
          fontFamily: "var(--font-mono, 'Share Tech Mono', monospace)",
          outline: "none",
          resize: "none",
        }}
      />
      {error && (
        <p className="display text-xs" style={{ color: "var(--se-red)", letterSpacing: ".2em" }}>
          ✗ {error.toUpperCase()}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="display text-xs tracking-widest px-4 py-2 transition-opacity disabled:opacity-30"
          style={{
            backgroundColor: "var(--se-gold)",
            color: "var(--se-black)",
            letterSpacing: ".2em",
            fontSize: "10px",
          }}
        >
          {loading ? "TRANSMITTING..." : "SUBMIT AMENDMENT →"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setText(""); setError(""); }}
          className="display text-xs transition-opacity hover:opacity-60"
          style={{ color: "var(--se-text-faint)", letterSpacing: ".2em", fontSize: "10px" }}
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
