import type { Meeting, Artifact } from "@nr-yn/db";
import {
  getOpenCycle as _getOpenCycle,
  getOrCreateOpenCycle as _getOrCreateOpenCycle,
  getCycleStateArtifact as _getCycleStateArtifact,
  parseCycleState,
  transitionCycle,
  autoAdvanceIfNeeded as _autoAdvanceIfNeeded,
} from "@nr-yn/governance";
import { COMMUNITY_ORG_ID, CYCLE_MAX_VOTING_DAYS } from "./config";

// Re-export generic types and pass-through functions
export type { CycleState } from "@nr-yn/governance";
export { parseCycleState, transitionCycle };
export { applyStalePolicy, type StalePolicy } from "@nr-yn/governance";

export function getOpenCycle(): Promise<Meeting | null> {
  return _getOpenCycle(COMMUNITY_ORG_ID, "council");
}

export function getOrCreateOpenCycle(): Promise<Meeting> {
  return _getOrCreateOpenCycle(COMMUNITY_ORG_ID, { meetingType: "council" });
}

export function getCycleStateArtifact(cycleId: string): Promise<Artifact | null> {
  return _getCycleStateArtifact(cycleId);
}

export function autoAdvanceIfNeeded(cycle: Meeting): Promise<boolean> {
  return _autoAdvanceIfNeeded(cycle, { maxVotingDays: CYCLE_MAX_VOTING_DAYS });
}
