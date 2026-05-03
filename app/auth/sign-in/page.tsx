import { Suspense } from "react";
import SignInForm from "./SignInForm";

export default function SignInPage() {
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
            Sign in to vote and participate
          </p>
        </div>
        <Suspense>
          <SignInForm />
        </Suspense>

        <div className="text-center">
          <a
            href="/auth/recover"
            className="text-xs tracking-widest uppercase transition-colors"
            style={{ color: "#6b9a6b" }}
          >
            Forgot access? →
          </a>
        </div>
      </div>
    </div>
  );
}
