"use client";

import { useEffect, useState } from "react";

const EMAIL_KEY = "hd2_submit_email";

const CATEGORIES = [
  { value: "balance", label: "Balance — Weapon / Stratagem Effectiveness" },
  { value: "bug",     label: "Critical Bug — Crash / Broken Mechanic" },
  { value: "qol",     label: "Quality of Life — UX / Friction Point" },
  { value: "content", label: "Content — New Features / Requests" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

const CATEGORY_COLOR: Record<string, string> = {
  balance: "#4ade80",
  bug:     "#dc2626",
  qol:     "#60a5fa",
  content: "#c9a227",
};

export default function SubmitIssueForm() {
  const [email, setEmail]               = useState("");
  const [title, setTitle]               = useState("");
  const [category, setCategory]         = useState<Category>("balance");
  const [description, setDescription]   = useState("");
  const [proposedChange, setProposedChange] = useState("");
  const [loading, setLoading]           = useState(false);
  const [submittedId, setSubmittedId]   = useState<string | null>(null);
  const [error, setError]               = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) setEmail(saved);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !title.trim() || !description.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          title: title.trim(),
          category,
          description: description.trim(),
          proposedChange: proposedChange.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Something went wrong");
        return;
      }

      const data = (await res.json()) as { issueId?: string };
      localStorage.setItem(EMAIL_KEY, email.trim());
      setSubmittedId(data.issueId ?? null);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  const accent = CATEGORY_COLOR[category] ?? "#4ade80";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "13px",
    backgroundColor: "var(--se-black)",
    border: "1px solid var(--se-gold-dim)",
    color: "var(--se-text)",
    fontFamily: "var(--font-mono, 'Share Tech Mono', monospace)",
    outline: "none",
    transition: "border-color .15s",
  };

  if (submittedId) {
    const trackUrl = `/issues/track/${submittedId}`;
    return (
      <div className="cb-green p-10 text-center space-y-4">
        <p className="display glow-green text-xl" style={{ color: "var(--se-green)", letterSpacing: ".1em" }}>
          REPORT FILED
        </p>
        <p className="text-sm" style={{ color: "var(--se-text-dim)" }}>
          Your field report is pending Command review.<br />
          Once approved, it will appear in the Intelligence Dossier.
        </p>
        <a
          href={trackUrl}
          className="display inline-block mt-2 px-5 py-2 text-xs tracking-widest transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--se-green)", color: "var(--se-black)", letterSpacing: ".25em", fontSize: "11px" }}
        >
          TRACK YOUR REPORT →
        </a>
        <p className="text-xs" style={{ color: "var(--se-text-faint)", fontSize: "10px" }}>
          Bookmark: {trackUrl}
        </p>
        <button
          onClick={() => {
            setSubmittedId(null);
            setTitle("");
            setDescription("");
            setProposedChange("");
          }}
          className="display text-xs tracking-widest mt-1 transition-opacity hover:opacity-60"
          style={{ color: "var(--se-text-dim)", letterSpacing: ".25em" }}
        >
          FILE ANOTHER REPORT
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Citizen ID */}
      <Field label="CITIZEN IDENTIFIER" hint="Not published — moderation contact only.">
        <input
          type="email"
          aria-label="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="helldiver@super-earth.gov"
          style={inputStyle}
          required
        />
      </Field>

      {/* Classification */}
      <Field label="REPORT CLASSIFICATION">
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            style={{ ...inputStyle, appearance: "none", paddingRight: "2.5rem", color: accent }}
            required
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} style={{ color: "var(--se-text)" }}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: accent }}>▼</span>
        </div>
      </Field>

      {/* Title */}
      <Field label={`REPORT TITLE (${title.length}/120)`}>
        <input
          type="text"
          aria-label="title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          placeholder="Clear, specific issue title — include weapon/mechanic name"
          style={inputStyle}
          required
          maxLength={120}
        />
      </Field>

      {/* Problem Statement */}
      <Field
        label={`PROBLEM STATEMENT (${description.length}/1000)`}
        hint="What is broken? Describe the issue, affected content, and expected vs actual behaviour."
      >
        <textarea
          aria-label="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
          placeholder="Describe the problem in detail. Include difficulty level, affected weapons/stratagems, steps to reproduce, and frequency."
          style={{ ...inputStyle, resize: "none" }}
          rows={5}
          required
          maxLength={1000}
        />
      </Field>

      {/* Proposed Change */}
      <Field
        label={`PROPOSED CHANGE (${proposedChange.length}/600) — OPTIONAL`}
        hint="How should Arrowhead fix this? Specific, realistic suggestions carry more weight."
        accent={accent}
      >
        <textarea
          value={proposedChange}
          onChange={(e) => setProposedChange(e.target.value.slice(0, 600))}
          placeholder="e.g. 'Reduce Orbital Railcannon cooldown from 3min to 2min, or increase damage vs Bile Titan by 25%'"
          style={{ ...inputStyle, resize: "none" }}
          rows={4}
          maxLength={600}
        />
      </Field>

      {error && (
        <p className="display text-xs" style={{ color: "var(--se-red)", letterSpacing: ".2em" }}>
          ✗ {error.toUpperCase()}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email.trim() || !title.trim() || !description.trim()}
        className="display w-full py-3 text-sm tracking-widest transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          backgroundColor: accent,
          color: "var(--se-black)",
          letterSpacing: ".3em",
          fontSize: "12px",
        }}
      >
        {loading ? "TRANSMITTING..." : "SUBMIT FIELD REPORT →"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  accent,
  children,
}: {
  label: string;
  hint?: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="display text-xs mb-2"
        style={{ color: accent ?? "var(--se-text-faint)", letterSpacing: ".25em", fontSize: "9px" }}
      >
        {label}
      </p>
      {children}
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--se-text-faint)", fontSize: "11px" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
