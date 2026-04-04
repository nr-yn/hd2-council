import type { Metadata } from "next";
import "./globals.css";
import { Rajdhani, Share_Tech_Mono } from "next/font/google";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { ADMIN_EMAIL } from "@/lib/config";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-rajdhani",
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-share-tech-mono",
});

export const metadata: Metadata = {
  title: "HD2 Community Council — Managed Democracy",
  description: "Helldivers 2 Community Council — For Democracy. For Balance. By the Community.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const isAdmin = session?.person.email === ADMIN_EMAIL;

  return (
    <html lang="en" className={`${rajdhani.variable} ${shareTechMono.variable}`}>
      <body className="min-h-screen antialiased">
        {/* ── Header ──────────────────────────────────────── */}
        <header
          style={{
            backgroundColor: "var(--se-dark)",
            borderBottom: "1px solid var(--se-gold-dim)",
          }}
          className="sticky top-0 z-50 flicker"
        >
          {/* Top strip */}
          <div
            className="text-center py-0.5 text-xs tracking-widest display"
            style={{
              backgroundColor: "var(--se-gold)",
              color: "var(--se-black)",
              fontSize: "9px",
              letterSpacing: ".35em",
            }}
          >
            ★ SUPER EARTH COMMUNITY DISPATCH TERMINAL ★ MANAGED DEMOCRACY PREVAILS ★
          </div>

          <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="display text-lg glow-gold" style={{ color: "var(--se-gold)" }}>
                  HD2 COUNCIL
                </span>
              </Link>

              {/* Nav */}
              <div className="flex items-center gap-1">
                <NavItem href="/issues" label="INTELLIGENCE" sublabel="Field Reports" />
                <NavItem href="/petitions" label="DISPATCHES" sublabel="Petitions" />
                <NavItem href="/issues/submit" label="FILE REPORT" sublabel="Submit Issue" highlight />
                {isAdmin && (
                  <NavItem href="/admin" label="COMMAND" sublabel="Admin" admin />
                )}
              </div>
            </div>

            {/* Auth */}
            <div className="text-xs" style={{ color: "var(--se-text-dim)" }}>
              {session ? (
                <span className="flex items-center gap-3">
                  <span className="display text-xs" style={{ color: "var(--se-gold)", fontSize: "10px" }}>
                    ● CITIZEN
                  </span>
                  <span style={{ color: "var(--se-text-dim)", fontSize: "10px" }}>
                    {session.person.email}
                  </span>
                  <form action="/api/auth/sign-out" method="POST">
                    <button
                      type="submit"
                      className="display uppercase tracking-widest transition-opacity hover:opacity-60"
                      style={{ color: "var(--se-text-faint)", fontSize: "10px", letterSpacing: ".2em" }}
                    >
                      DEBRIEF
                    </button>
                  </form>
                </span>
              ) : (
                <Link
                  href="/auth/sign-in"
                  className="display transition-colors hover:opacity-80"
                  style={{ color: "var(--se-text-dim)", fontSize: "10px", letterSpacing: ".2em" }}
                >
                  IDENTIFY YOURSELF →
                </Link>
              )}
            </div>
          </nav>
        </header>

        {/* ── Main ────────────────────────────────────────── */}
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer
          className="mt-16 py-6"
          style={{ borderTop: "1px solid var(--se-gold-dim)" }}
        >
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-between flex-wrap gap-2">
            <p className="display text-xs" style={{ color: "var(--se-text-faint)", letterSpacing: ".2em" }}>
              ★★★ FOR SUPER EARTH ★★★
            </p>
            <p className="text-xs" style={{ color: "var(--se-text-faint)", fontSize: "9px" }}>
              COMMUNITY-DRIVEN · NOT AFFILIATED WITH ARROWHEAD GAME STUDIOS · MANAGED DEMOCRACY
            </p>
            <p className="display text-xs" style={{ color: "var(--se-text-faint)", letterSpacing: ".2em" }}>
              ★★★ LIBERTY OR DEATH ★★★
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavItem({
  href,
  label,
  sublabel,
  highlight,
  admin,
}: {
  href: string;
  label: string;
  sublabel: string;
  highlight?: boolean;
  admin?: boolean;
}) {
  if (admin) {
    return (
      <Link
        href={href}
        className="display px-3 py-1 text-xs tracking-widest transition-opacity hover:opacity-80"
        style={{
          color: "var(--se-amber)",
          border: "1px solid rgba(245,158,11,.3)",
          fontSize: "10px",
        }}
      >
        {label}
      </Link>
    );
  }
  if (highlight) {
    return (
      <Link
        href={href}
        className="display px-3 py-1 text-xs tracking-widest transition-opacity hover:opacity-80"
        style={{
          color: "var(--se-black)",
          backgroundColor: "var(--se-gold)",
          fontSize: "10px",
        }}
      >
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="display px-3 py-1 text-xs tracking-widest transition-opacity hover:opacity-70"
      style={{ color: "var(--se-text-dim)", fontSize: "10px" }}
    >
      {label}
    </Link>
  );
}
