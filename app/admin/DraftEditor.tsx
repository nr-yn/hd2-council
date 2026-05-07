"use client";

import { useState, useRef } from "react";

interface DraftEditorProps {
  initialBody: string;
  artifactId: string;
  petitionId?: string;
}

export default function DraftEditor({ initialBody, artifactId, petitionId }: DraftEditorProps) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleAutoSave(value: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(value), 1200);
  }

  async function save(value: string) {
    setStatus("saving");
    try {
      const res = await fetch("/api/admin/draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: value }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-0.5">
          <p className="display text-xs" style={{ color: "var(--se-blue)", letterSpacing: ".2em", fontSize: "10px" }}>
            PETITION DRAFT — EDITABLE
          </p>
          <p className="text-xs" style={{ color: "var(--se-hint)" }}>
            Auto-saves as you type. Use{" "}
            <code className="px-1" style={{ backgroundColor: "var(--se-panel)", color: "var(--se-text)" }}>
              {"<!-- pagebreak -->"}
            </code>{" "}
            on its own line to insert a page break in the PDF.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === "saving" && (
            <span className="display text-xs" style={{ color: "var(--se-hint)", fontSize: "10px", letterSpacing: ".15em" }}>
              SAVING…
            </span>
          )}
          {status === "saved" && (
            <span className="display text-xs" style={{ color: "var(--se-green)", fontSize: "10px", letterSpacing: ".15em" }}>
              SAVED
            </span>
          )}
          {status === "error" && (
            <span className="display text-xs" style={{ color: "var(--se-red)", fontSize: "10px", letterSpacing: ".15em" }}>
              SAVE FAILED
            </span>
          )}
          {petitionId && (
            <a
              href={`/api/documents/${petitionId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="display text-xs px-3 py-1.5 transition-opacity hover:opacity-80"
              style={{ border: "1px solid var(--se-blue)", color: "var(--se-blue)", letterSpacing: ".2em", fontSize: "10px" }}
            >
              PREVIEW PDF ↗
            </a>
          )}
        </div>
      </div>

      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setStatus("idle");
          scheduleAutoSave(e.target.value);
        }}
        rows={28}
        spellCheck={false}
        className="w-full font-mono text-xs resize-y"
        style={{
          backgroundColor: "var(--se-bg)",
          color: "var(--se-text)",
          border: "1px solid var(--se-gold-dim)",
          padding: "12px",
          lineHeight: "1.6",
          outline: "none",
        }}
      />

      <p className="text-xs" style={{ color: "var(--se-text-faint)" }}>
        Markdown is rendered in the PDF. Bold: **text** · Italic: *text* · Heading: # / ## / ### · Rule: ---
      </p>
    </div>
  );
}
