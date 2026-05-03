import SubmitIssueForm from "./SubmitIssueForm";

export default function SubmitIssuePage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl font-bold tracking-widest uppercase"
          style={{ color: "#4ade80" }}
        >
          Submit an Issue
        </h1>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--se-hint)" }}>
          Report a balance problem, bug, quality-of-life concern, or content request. Your
          submission will be reviewed by a moderator before being approved for the community vote.
        </p>
      </div>
      <SubmitIssueForm />
    </div>
  );
}
