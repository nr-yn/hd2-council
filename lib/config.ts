export const COMMUNITY_ORG_ID = "hd2-community-1";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@hd2council.local";
export const SESSION_COOKIE = "hd2_session";
export const TOP_N_ISSUES = 10;

// Cycle phase durations (days)
export const CYCLE_SUBMISSION_DAYS = 5;
export const CYCLE_VOTING_DAYS = 6;
export const CYCLE_DRAFTING_DAYS = 3;

// Petition selection rules
export const MIN_VOTES_FOR_PETITION = 5;
export const CATEGORY_CAPS: Record<string, number> = { balance: 5, bug: 3, qol: 3, content: 2 };
export const CATEGORY_GUARANTEES: Record<string, number> = { balance: 0, bug: 1, qol: 1, content: 0 };

// Submission rate limit
export const MAX_SUBMISSIONS_PER_EMAIL_PER_CYCLE = 3;

// Voting rate limit — max total votes a single email can cast per cycle
export const MAX_VOTES_PER_EMAIL_PER_CYCLE = 10;

// Auto-advance thresholds
// Voting phase ends when total votes reach this, OR the fallback age is exceeded
export const CYCLE_VOTE_THRESHOLD = 4_000;
export const CYCLE_MAX_VOTING_DAYS = 30;

// Artifact mime type for cycle state (phase timestamps)
export const CYCLE_STATE_MIME = "application/x-cycle-state";
