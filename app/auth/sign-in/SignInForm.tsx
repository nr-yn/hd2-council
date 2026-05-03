"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: "That link has expired or already been used. Request a new one.",
  missing_token: "No token found. Request a fresh sign-in link.",
};

export default function SignInForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? "Something went wrong");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div
        className="border rounded p-8 text-center space-y-3"
        style={{ backgroundColor: "#0d1a0d", borderColor: "#1e3a1e" }}
      >
        <p className="font-bold text-sm tracking-widest uppercase" style={{ color: "#4ade80" }}>
          Check your email
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#6b9a6b" }}>
          A sign-in link was sent to{" "}
          <span style={{ color: "#a3c9a3" }}>{email}</span>.
        </p>
        <p className="text-xs" style={{ color: "#6b9a6b" }}>
          In dev mode, check the server console for the link.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="text-xs tracking-widest uppercase mt-2 transition-colors"
          style={{ color: "#6b9a6b" }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div
      className="border rounded p-6 space-y-5"
      style={{ backgroundColor: "#0d1a0d", borderColor: "#1e3a1e" }}
    >
      {urlError && (
        <p
          className="text-xs border rounded px-3 py-2"
          style={{ color: "#ef4444", backgroundColor: "#1a0a0a", borderColor: "#3a1010" }}
        >
          {ERROR_MESSAGES[urlError] ?? "Something went wrong."}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-xs tracking-widest uppercase mb-1.5"
            style={{ color: "#6b9a6b" }}
          >
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded border px-3 py-2.5 text-sm transition-all focus:outline-none focus:border-lime-600"
            style={{
              backgroundColor: "#0a0c0a",
              borderColor: "#1e3a1e",
              color: "#d4e8c2",
            }}
            required
            autoFocus
          />
        </div>

        {error && (
          <p className="text-xs" style={{ color: "#ef4444" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full text-xs tracking-widest uppercase font-bold py-2.5 rounded border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "#0a2a0a",
            borderColor: "#4ade80",
            color: "#4ade80",
          }}
        >
          {loading ? "Sending..." : "Send sign-in link"}
        </button>
      </form>

      <p className="text-xs text-center" style={{ color: "#6b9a6b" }}>
        No password needed — we email you a one-time link.
      </p>
    </div>
  );
}
