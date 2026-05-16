"use client";
import { useState, type CSSProperties } from "react";

export default function ShareButtons({
  url,
  title,
  votes,
  proposedChange,
  description,
}: {
  url: string;
  title: string;
  votes: number;
  proposedChange: string | null;
  description: string;
}) {
  const [copied, setCopied] = useState(false);
  const [redditCopied, setRedditCopied] = useState(false);

  const redditBody = [
    `**[HD2 Council] ${title}** | ${votes.toLocaleString()} citizens have voiced support`,
    "",
    description.slice(0, 300) + (description.length > 300 ? "…" : ""),
    proposedChange ? `\n**Proposed fix:** ${proposedChange.slice(0, 200)}${proposedChange.length > 200 ? "…" : ""}` : "",
    "",
    `Vote here: ${url}`,
    "",
    "*HD2 Community Council — your grievances become petitions to Arrowhead.*",
  ].filter(Boolean).join("\n");

  const tweetText = encodeURIComponent(`${title} — ${votes.toLocaleString()} HD2 citizens want this fixed. Vote:`);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(url)}`;

  const copyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /**/ }
  };

  const copyReddit = async () => {
    try {
      await navigator.clipboard.writeText(redditBody);
      setRedditCopied(true);
      setTimeout(() => setRedditCopied(false), 2500);
    } catch { /**/ }
  };

  const btnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "10px",
    letterSpacing: ".25em",
    padding: "6px 14px",
    border: "1px solid var(--se-text-faint)",
    color: "var(--se-text-dim)",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity .15s",
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ padding: "10px 0" }}>
      <button className="display" style={btnStyle} onClick={copyLink}>
        {copied ? "✓ COPIED" : "⬡ COPY LINK"}
      </button>

      <button
        className="display"
        style={btnStyle}
        onClick={copyReddit}
        title="Copy a ready-to-post Reddit markdown for r/Helldivers"
      >
        {redditCopied ? "✓ READY TO PASTE" : "↗ COPY FOR REDDIT"}
      </button>

      <a
        className="display"
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...btnStyle, textDecoration: "none" }}
      >
        𝕏 SHARE ON X
      </a>
    </div>
  );
}
