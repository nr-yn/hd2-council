"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UpvoteButtonProps {
  issueId: string;
  initialVotes: number;
  votesRemaining: number;
}

export default function UpvoteButton({ issueId, initialVotes, votesRemaining }: UpvoteButtonProps) {
  const router = useRouter();
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(false);
  const [remaining, setRemaining] = useState(votesRemaining);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVote() {
    if (loading || voted) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/issues/${issueId}/vote`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Failed to cast vote");
        return;
      }
      const data = (await res.json()) as { votesFor: number };
      setVotes(data.votesFor);
      setRemaining((r) => r - 1);
      setVoted(true);
      router.refresh(); // re-render server components to update the displayed vote count
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  if (voted) {
    return (
      <div className="text-center space-y-1">
        <p className="display text-xs tracking-widest" style={{ color: "#4ade80", letterSpacing: ".3em" }}>
          ✓ VOICE RECORDED — FOR DEMOCRACY
        </p>
        <p className="display text-xs" style={{ color: "var(--se-text-faint)", fontSize: "9px", letterSpacing: ".2em" }}>
          {votes.toLocaleString()} VOICES · {remaining} VOTES REMAINING THIS CYCLE
        </p>
      </div>
    );
  }

  const atLimit = remaining <= 0;

  return (
    <div className="text-center space-y-2">
      <button
        onClick={handleVote}
        disabled={loading || atLimit}
        className="display text-xs tracking-widest uppercase px-6 py-2.5 transition-all disabled:opacity-40"
        style={{
          backgroundColor: atLimit ? "transparent" : "#0a2a0a",
          border: `1px solid ${atLimit ? "var(--se-text-faint)" : "#4ade80"}`,
          color: atLimit ? "var(--se-text-faint)" : "#4ade80",
          letterSpacing: ".2em",
        }}
      >
        {loading ? "TRANSMITTING..." : atLimit ? "VOTE LIMIT REACHED" : "CAST VOICE"}
      </button>
      <p className="display text-xs" style={{ color: "var(--se-text-faint)", fontSize: "9px", letterSpacing: ".2em" }}>
        {atLimit ? "VOTE ALLOCATION EXHAUSTED FOR THIS CYCLE" : `${remaining} VOTES REMAINING THIS CYCLE`}
      </p>
      {error && (
        <p className="text-xs" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}
    </div>
  );
}
