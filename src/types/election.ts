export type ElectionStatus =
  | 'REGISTRATION_OPEN'
  | 'ELECTION_SCHEDULED'
  | 'VOTING_OPENS_SOON'
  | 'VOTING_LIVE'
  | 'VOTING_PAUSED'
  | 'VOTING_CLOSED'
  | 'RESULTS_PUBLISHED';

export type ResultsVisibility =
  | 'HIDDEN'
  | 'TURNOUT_ONLY'
  | 'LIVE_COUNTS'
  | 'PUBLIC_AFTER_CLOSE';

export type UserRole = 'VOTER' | 'ADMIN';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  voterCode: string; // Unique voter registration code
  role: UserRole;
  approvalStatus: ApprovalStatus;
  registeredAt: string;
  verifiedAt?: string | null;
  passwordHash?: string;
}

export interface ElectionPosition {
  id: string;
  electionId: string;
  title: string;
  description: string;
  orderIndex: number;
  allowAbstain: boolean;
  maxSelections: number;
  createdAt: string;
}

export interface Candidate {
  id: string;
  positionId: string;
  candidateNumber: string;
  fullName: string;
  photoUrl: string;
  campaignTagline: string;
  campaignDescription: string;
  manifesto: string;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

export interface Election {
  id: string;
  title: string;
  tagline: string;
  description: string;
  status: ElectionStatus;
  startTime: string; // ISO date string
  endTime: string;   // ISO date string
  timezone: string;
  allowAbstentions: boolean;
  resultsVisibility: ResultsVisibility;
  isEmergencyPaused: boolean;
  emergencyPauseReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoterEligibility {
  id: string;
  voterId: string;
  electionId: string;
  isEligible: boolean;
  hasVoted: boolean;
  tokenIssued: boolean;
  votedAt?: string | null;
  receiptCode?: string | null;
}

// Strictly separates voter identity from candidate choices
export interface AnonymousBallot {
  id: string;
  electionId: string;
  nullifierHash: string; // Cryptographic hash preventing double spend
  castAt: string;
  receiptCode: string;   // Hash code given to voter to verify their vote is in the tally
  auditHash: string;     // Hash chain for cryptographic tamper evidence
}

export interface BallotSelection {
  id: string;
  ballotId: string;
  positionId: string;
  candidateId: string | null; // null if abstained
  isAbstain: boolean;
}

export interface PositionResult {
  positionId: string;
  positionTitle: string;
  totalVotesCast: number;
  totalAbstentions: number;
  candidates: {
    candidateId: string;
    candidateNumber: string;
    fullName: string;
    photoUrl: string;
    campaignTagline: string;
    voteCount: number;
    percentage: number;
    isWinner: boolean;
  }[];
  isTie: boolean;
  tieCandidates?: string[];
  winner?: {
    candidateId: string;
    candidateNumber: string;
    fullName: string;
    photoUrl: string;
    voteCount: number;
    percentage: number;
  } | null;
}

export interface ElectionResults {
  electionId: string;
  calculatedAt: string;
  totalRegisteredVoters: number;
  totalVerifiedVoters: number;
  totalBallotsCast: number;
  turnoutPercentage: number;
  positions: PositionResult[];
  status: ElectionStatus;
  resultsVisibility: ResultsVisibility;
  canViewCandidateScores: boolean;
  canViewTurnout: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actorType: 'VOTER' | 'ADMIN' | 'SYSTEM';
  actorId?: string | null;
  actorName?: string | null;
  details: Record<string, any>;
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface BlindedVotingToken {
  electionId: string;
  tokenId: string;
  nullifierSeed: string; // Secret seed retained only in voter client memory
  nullifierHash: string; // Public commitment
  signature: string;    // Master HMAC signature proving legitimacy
  expiresAt: string;
}

export interface BallotSubmissionPayload {
  electionId: string;
  votingToken: string;
  nullifierSeed: string;
  selections: {
    positionId: string;
    candidateId: string | null;
    isAbstain?: boolean;
  }[];
}
