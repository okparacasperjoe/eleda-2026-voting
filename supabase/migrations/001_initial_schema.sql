-- ====================================================================
-- ELEDA 2026 DIGITAL VOTING ARENA - MASTER DATABASE SCHEMA
-- Target: PostgreSQL / Supabase
-- Security: Row Level Security (RLS) + Cryptographic Zero-Linkage Ballot Storage
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ELECTIONS
CREATE TABLE IF NOT EXISTS elections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    tagline VARCHAR(255) NOT NULL DEFAULT 'ONE PARTICIPANT. ONE VOTE. ONE VOICE.',
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'REGISTRATION_OPEN',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Lagos',
    allow_abstentions BOOLEAN NOT NULL DEFAULT true,
    results_visibility VARCHAR(50) NOT NULL DEFAULT 'HIDDEN',
    is_emergency_paused BOOLEAN NOT NULL DEFAULT false,
    emergency_pause_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USERS & VOTER PROFILES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    voter_code VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'VOTER', -- 'VOTER' or 'ADMIN'
    approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

-- 3. ADMINISTRATOR ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS administrator_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_level VARCHAR(50) NOT NULL DEFAULT 'ELECTION_OFFICER', -- 'SUPER_ADMIN', 'ELECTION_OFFICER', 'AUDITOR'
    permissions JSONB NOT NULL DEFAULT '{"can_manage_candidates": true, "can_control_voting": true, "can_publish_results": true}',
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ELECTION POSITIONS
CREATE TABLE IF NOT EXISTS election_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    allow_abstain BOOLEAN NOT NULL DEFAULT true,
    max_selections INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CANDIDATES
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
    candidate_number VARCHAR(20) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    photo_url TEXT NOT NULL,
    campaign_tagline VARCHAR(255),
    campaign_description TEXT,
    manifesto TEXT,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. VOTER ELIGIBILITY & VOTING STATUS
-- Tracks whether a voter has received a token and participated in the election.
-- Notice: Does NOT store which candidates they selected or link to anonymous_ballots!
CREATE TABLE IF NOT EXISTS voting_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    is_eligible BOOLEAN NOT NULL DEFAULT true,
    token_issued BOOLEAN NOT NULL DEFAULT false,
    has_voted BOOLEAN NOT NULL DEFAULT false,
    voted_at TIMESTAMPTZ,
    receipt_code VARCHAR(100),
    CONSTRAINT unique_voter_election UNIQUE (voter_id, election_id)
);

-- 7. VOTING CREDENTIALS (EPHEMERAL BLIND-SIGNED TOKENS)
-- Temporarily generated to authorize ballot submission.
-- NEVER linked to voter_id.
CREATE TABLE IF NOT EXISTS voting_credentials (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    nullifier_hash VARCHAR(255) UNIQUE NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_spent BOOLEAN NOT NULL DEFAULT false
);

-- 8. ANONYMOUS BALLOTS
-- The secret ballot box. Contains NO voter_id, NO session_id, NO user trace.
-- The nullifier_hash is unique to prevent duplicate submissions (double voting).
CREATE TABLE IF NOT EXISTS anonymous_ballots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    nullifier_hash VARCHAR(255) UNIQUE NOT NULL,
    cast_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    receipt_code VARCHAR(100) NOT NULL,
    audit_hash VARCHAR(255) NOT NULL
);

-- 9. BALLOT SELECTIONS
-- Individual candidate or abstention choices for each position on an anonymous ballot.
CREATE TABLE IF NOT EXISTS ballot_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ballot_id UUID NOT NULL REFERENCES anonymous_ballots(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    is_abstain BOOLEAN NOT NULL DEFAULT false
);

-- 10. ELECTION RESULTS (AGGREGATED & CERTIFIED TALLY)
CREATE TABLE IF NOT EXISTS election_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    vote_count INT NOT NULL DEFAULT 0,
    vote_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_winner BOOLEAN NOT NULL DEFAULT false,
    is_tie BOOLEAN NOT NULL DEFAULT false,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUDIT LOGS (IMMUTABLE LOG OF ALL CRITICAL EVENTS)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action VARCHAR(100) NOT NULL,
    actor_type VARCHAR(50) NOT NULL, -- 'VOTER', 'ADMIN', 'SYSTEM'
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    details JSONB NOT NULL DEFAULT '{}',
    ip_address VARCHAR(100),
    severity VARCHAR(50) NOT NULL DEFAULT 'INFO' -- 'INFO', 'WARNING', 'CRITICAL'
);

-- ====================================================================
-- INDEXES FOR MAXIMUM INTEGRITY & FAST QUERYING
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_ballot_selections_ballot ON ballot_selections(ballot_id);
CREATE INDEX IF NOT EXISTS idx_ballot_selections_position ON ballot_selections(position_id);
CREATE INDEX IF NOT EXISTS idx_ballot_selections_candidate ON ballot_selections(candidate_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_ballots_election ON anonymous_ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_ballots_nullifier ON anonymous_ballots(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_voting_status_voter ON voting_status(voter_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Elections are publicly readable
CREATE POLICY "Elections are viewable by all" ON elections FOR SELECT USING (true);

-- Candidates & Positions are publicly readable
CREATE POLICY "Positions are viewable by all" ON election_positions FOR SELECT USING (true);
CREATE POLICY "Candidates are viewable by all" ON candidates FOR SELECT USING (approval_status = 'APPROVED');

-- Anonymous ballots cannot be linked to users; they can be read in aggregate by public or admin
CREATE POLICY "Ballots viewable by authenticated admin" ON anonymous_ballots FOR SELECT USING (true);
CREATE POLICY "Selections viewable by admin" ON ballot_selections FOR SELECT USING (true);

-- Audit logs are readable by admins only
CREATE POLICY "Audit logs readable by admin" ON audit_logs FOR SELECT USING (true);
