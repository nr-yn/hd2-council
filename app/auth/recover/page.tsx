import { Suspense } from "react";
import SignInForm from "../sign-in/SignInForm";

export default function RecoverPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0a0c0a" }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-widest uppercase"
            style={{ color: "#4ade80" }}
          >
            HD2 Council
          </h1>
          <p className="text-sm mt-2 tracking-wide" style={{ color: "#6b9a6b" }}>
            Recover account access
          </p>
        </div>

        <p className="text-xs text-center tracking-wide" style={{ color: "#6b9a6b" }}>
          Lost access to your account? Enter your email and we&apos;ll send you a recovery link.
        </p>

        <Suspense>
          <SignInForm />
        </Suspense>

        <div className="text-center">
          <a
            href="/auth/sign-in"
            className="text-xs tracking-widest uppercase transition-colors"
            style={{ color: "#6b9a6b" }}
          >
            ← Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
