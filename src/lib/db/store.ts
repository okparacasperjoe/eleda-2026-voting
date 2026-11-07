import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  Election,
  ElectionPosition,
  Candidate,
  User,
  VoterEligibility,
  AnonymousBallot,
  BallotSelection,
  AuditLog,
  ElectionResults,
  PositionResult,
} from '@/types/election';
import { hashPassword } from '@/lib/voting/crypto';

/** Tracks which positions a device has voted for — zero linkage to ballot selections. */
export interface DeviceVotingStatus {
  /** HMAC hash of raw device fingerprint — never the raw fingerprint itself. */
  deviceHash: string;
  electionId: string;
  /** List of positionIds already voted for by this device. */
  positionsVoted: string[];
  /** True once the device has been issued a blinded token. */
  tokenIssued: boolean;
  firstSeenAt: string;
  lastActivityAt: string;
  /** Spent nullifier hashes (replay-attack prevention). */
  spentNullifiers: string[];
}

export interface DatabaseState {
  election: Election;
  positions: ElectionPosition[];
  candidates: Candidate[];
  users: User[];
  votingStatus: VoterEligibility[];
  /** Device-based anonymous voting state — replaces per-user eligibility for public voting. */
  deviceVotingStatus: DeviceVotingStatus[];
  anonymousBallots: AnonymousBallot[];
  ballotSelections: BallotSelection[];
  auditLogs: AuditLog[];
  lastAuditHash: string;
}

// Vercel serverless environment support (write to /tmp on Vercel, data/ locally)
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? os.tmpdir() : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'eleda_db.json');
const BUNDLED_DB_FILE = path.join(process.cwd(), 'data', 'eleda_db.json');

// Initial seed data generator
function createInitialSeedData(): DatabaseState {
  const electionId = 'e1eda202-6000-4000-8000-000000000001';

  const election: Election = {
    id: electionId,
    title: 'ELEDA 2026 DIGITAL VOTING ARENA',
    tagline: 'ONE PARTICIPANT. ONE VOTE. ONE VOICE.',
    description:
      'Official General Election for the ELEDA 2026 Leadership & Executive Council. Featuring verifiable cryptographic anonymous voting for registered delegates.',
    status: 'VOTING_LIVE',
    startTime: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), // Started 6 hours ago
    endTime: new Date(Date.now() + 42 * 3600 * 1000).toISOString(),   // Closes in 42 hours
    timezone: 'Africa/Lagos (GMT+1)',
    allowAbstentions: true,
    resultsVisibility: 'TURNOUT_ONLY',
    isEmergencyPaused: false,
    emergencyPauseReason: null,
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const positions: ElectionPosition[] = [
    {
      id: 'pos-01-gov',
      electionId,
      title: 'Class Governor',
      description:
        'Chief Executive Officer presiding over class governance, strategic initiatives, delegate advocacy, and student cohort leadership.',
      orderIndex: 1,
      allowAbstain: true,
      maxSelections: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pos-02-dep-gov',
      electionId,
      title: 'Deputy Governor',
      description:
        'Deputizing and acting for the leader, supporting strategic and political leadership, and managing communication and stakeholder relations.',
      orderIndex: 2,
      allowAbstain: true,
      maxSelections: 1,
      createdAt: new Date().toISOString(),
    },
  ];

  const candidates: Candidate[] = [
    // Class Governor Candidates (5 Authentic Candidates from Official Posters)
    {
      id: 'cand-gov-01',
      positionId: 'pos-01-gov',
      candidateNumber: '01',
      fullName: 'Outstanding Oyindamola (Iremide Fabrics)',
      photoUrl: '/candidates/oyindamola.jpg',
      campaignTagline: 'Leadership, Excellence, Innovation, Service & Impact — Ready to Serve',
      campaignDescription:
        'ELEDA 2.0 Graduate & Entrepreneur (Iremide Fabrics) committed to dedicated service, excellence, innovative solutions, and positive impact for all participants.',
      manifesto:
        '1. Leadership & Service: Dedicated representation listening and acting on participant needs.\n2. Innovation & Impact: Pioneering forward-thinking initiatives that uplift every member.\n3. Community Excellence: Fostering a supportive, collaborative environment across the ELEDA network.\n4. Practical Empowerment: Providing actionable growth opportunities for emerging leaders.',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cand-gov-02',
      positionId: 'pos-01-gov',
      candidateNumber: '02',
      fullName: 'JCIN Amb. Izuumia Barilera Faith PhD',
      photoUrl: '/candidates/izuumia-barilera-faith.jpg',
      campaignTagline: 'People • Progress • Prosperity — Building a Greater Eleda Together',
      campaignDescription:
        'JCIN Ambassador with doctorate-level academic and leadership expertise, championing inclusive governance, economic growth, and digital transformation.',
      manifesto:
        '1. Inclusive Governance: Ensuring transparent decision-making with every voice represented.\n2. Economic Growth: Unlocking entrepreneurial resources, partnerships, and market access.\n3. Digital Transformation: Modernizing communication and operations for efficiency.\n4. Better Lives: Prioritizing participant welfare, mentorship, and lasting prosperity.',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cand-gov-03',
      positionId: 'pos-01-gov',
      candidateNumber: '03',
      fullName: 'Olansile Olanrewaju',
      photoUrl: '/candidates/olansile-olanrewaju.jpg',
      campaignTagline: 'Support & Vote Olansile Olanrewaju as Governor',
      campaignDescription:
        'Dynamic leader committed to responsive governance, participant solidarity, and actionable development programs.',
      manifesto:
        '1. Transparent Advocacy: Open dialogue and rapid response to participant concerns.\n2. Grassroots Unity: Bridging cohorts to foster strong community synergy.\n3. Practical Empowerment: Direct support for participant projects and career advancement.\n4. Dedicated Representation: Consistent support for delegate initiatives.',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cand-gov-04',
      positionId: 'pos-01-gov',
      candidateNumber: '04',
      fullName: 'Usman Aishat Omotomiwa (Adorable Aishah)',
      photoUrl: '/candidates/aishat-omotomiwa.jpg',
      campaignTagline: 'Leadership Through Empowerment, Engagement and Growth — Empower • Engage • Grow',
      campaignDescription:
        'Passionate leader advocating "One Class. One Voice. One Community. Growing Together." through participatory leadership and holistic development.',
      manifesto:
        '1. Empower: Skill-building workshops, leadership incubators, and resource sharing.\n2. Engage: Active town halls, feedback channels, and community check-ins.\n3. Grow: Sustainable peer networks, mentorship pairings, and collective milestones.\n4. One Voice: Ensuring collective representation for all cohort delegates.',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cand-gov-05',
      positionId: 'pos-01-gov',
      candidateNumber: '05',
      fullName: 'JCIN Amb. Charles Ebo',
      photoUrl: '/candidates/charles-ebo.jpg',
      campaignTagline: 'Engage. Innovate. Inspire.',
      campaignDescription:
        'JCIN Ambassador and visionary strategist dedicated to driving high-impact innovation, member engagement, and inspirational leadership.',
      manifesto:
        '1. Engage: Interactive leadership frameworks and active member participation.\n2. Innovate: Creative problem solving and modern digital integration.\n3. Inspire: Motivating excellence and building an enduring legacy for ELEDA 2026.\n4. Collaborative Vision: Connecting cohorts to real-world opportunities.',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
    },

    // Deputy Governor Candidates (Authentic Candidates from Official Posters)
    {
      id: 'cand-dep-01',
      positionId: 'pos-02-dep-gov',
      candidateNumber: '01',
      fullName: 'Hadiza Oladipupo',
      photoUrl: '/candidates/hadiza-oladipupo.jpg',
      campaignTagline: 'Together, for a Greater ELEDA',
      campaignDescription:
        'Candidate for Deputy Governor dedicated to deputizing and acting for the leader, supporting strategic leadership, and managing stakeholder relations.',
      manifesto:
        '1. Deputizing & Acting for the Leader: Providing seamless executive continuity and dependable operational governance.\n2. Strategic & Political Leadership: Aligning cohort goals with actionable leadership and policy execution.\n3. Communication & Stakeholder Relations: Bridging participants, administration, and partners for a unified ELEDA community.\n4. Participant Welfare: Dedicated support for every delegate.',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cand-dep-02',
      positionId: 'pos-02-dep-gov',
      candidateNumber: '02',
      fullName: 'Tina Paul',
      photoUrl: '/candidates/tina-paul.jpg',
      campaignTagline: 'People • Progress • Prosperity — Building a Greater Eleda Together',
      campaignDescription:
        'Candidate for Deputy Governor committed to inclusive leadership, economic growth, digital innovation, and better lives for all delegates.',
      manifesto:
        '1. Inclusive Leadership: Fostering an environment where every cohort voice is valued and heard.\n2. Economic Growth: Promoting enterprise development, networking, and commercial opportunities.\n3. Digital Innovation: Integrating modern digital tools to enhance delegate experience and connectivity.\n4. Better Lives: Ensuring active support, community well-being, and mutual advancement.',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
    },
  ];

  // Pre-configured Users
  const defaultPasswordHash = hashPassword('VoterPassword2026!');
  const adminPasswordHash = hashPassword('AdminPassword2026!');

  const users: User[] = [
    {
      id: 'user-admin-01',
      fullName: 'Chief Electoral Commissioner (Admin)',
      email: 'admin@eleda2026.org',
      phone: '+234 800 123 4567',
      voterCode: 'ELEDA-ADMIN-001',
      role: 'ADMIN',
      approvalStatus: 'APPROVED',
      registeredAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
      verifiedAt: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
      passwordHash: adminPasswordHash,
    },
    // Ready-to-vote test user
    {
      id: 'user-voter-01',
      fullName: 'Adebayo Samuel Adeleke',
      email: 'voter1@eleda2026.org',
      phone: '+234 802 111 2233',
      voterCode: 'ELEDA-2026-9041',
      role: 'VOTER',
      approvalStatus: 'APPROVED',
      registeredAt: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
      verifiedAt: new Date(Date.now() - 9 * 86400 * 1000).toISOString(),
      passwordHash: defaultPasswordHash,
    },
    // User who already cast a vote
    {
      id: 'user-voter-02',
      fullName: 'Ngozi Beatrice Okoye',
      email: 'voter2@eleda2026.org',
      phone: '+234 803 222 3344',
      voterCode: 'ELEDA-2026-8812',
      role: 'VOTER',
      approvalStatus: 'APPROVED',
      registeredAt: new Date(Date.now() - 12 * 86400 * 1000).toISOString(),
      verifiedAt: new Date(Date.now() - 11 * 86400 * 1000).toISOString(),
      passwordHash: defaultPasswordHash,
    },
    // Pending verification user
    {
      id: 'user-voter-03',
      fullName: 'Ibrahim Danladi Sani',
      email: 'voter3@eleda2026.org',
      phone: '+234 804 333 4455',
      voterCode: 'ELEDA-2026-7734',
      role: 'VOTER',
      approvalStatus: 'PENDING',
      registeredAt: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
      verifiedAt: null,
      passwordHash: defaultPasswordHash,
    },
    // Rejected registration user
    {
      id: 'user-voter-04',
      fullName: 'Chukwuma Kingsley Obi',
      email: 'voter4@eleda2026.org',
      phone: '+234 805 444 5566',
      voterCode: 'ELEDA-2026-6621',
      role: 'VOTER',
      approvalStatus: 'REJECTED',
      registeredAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
      verifiedAt: null,
      passwordHash: defaultPasswordHash,
    },
  ];

  // Generate 25 additional realistic approved voters to create realistic election data
  const sampleNames = [
    'Amara Chioma Eze', 'Babatunde Folarin', 'Amina Yusuf Garba', 'Emeka Stanley Ugo',
    'Folashade Olamide', 'Kareem Abdulrahman', 'Blessing Chinwe Nwosu', 'Oluwaseun Balogun',
    'Hauwa Mohammed Bello', 'Tunde Ayodele Peters', 'Joy Eberechukwu', 'Musa Kabir Aliyu',
    'Funmilayo Adesina', 'Chinedu Bright Ibe', 'Zainab Kabir Sani', 'Victor Ebuka Onu',
    'Ronke Victoria Awolowo', 'Mustapha Sadiq Gombe', 'Khadijah Abdullahi', 'Godwin Osagie',
    'Halima Datti Ahmed', 'Kayode Emmanuel', 'Precious Ezinne', 'Suleiman Farouk', 'Titi Oluwatoyin'
  ];

  sampleNames.forEach((name, idx) => {
    const num = (idx + 5).toString().padStart(2, '0');
    users.push({
      id: `user-voter-${num}`,
      fullName: name,
      email: `delegate${num}@eleda2026.org`,
      phone: `+234 80${(60000000 + idx * 777).toString().slice(0, 8)}`,
      voterCode: `ELEDA-2026-${(5000 + idx * 47).toString()}`,
      role: 'VOTER',
      approvalStatus: 'APPROVED',
      registeredAt: new Date(Date.now() - (15 + idx) * 86400 * 1000).toISOString(),
      verifiedAt: new Date(Date.now() - (14 + idx) * 86400 * 1000).toISOString(),
      passwordHash: defaultPasswordHash,
    });
  });

  // Setup Voting Status (Eligibility)
  const votingStatus: VoterEligibility[] = users.map((user) => {
    const isApproved = user.approvalStatus === 'APPROVED';
    // Let voter2 and delegates 05 to 18 have already voted
    const hasVoted =
      user.id === 'user-voter-02' ||
      (user.id.startsWith('user-voter-') && parseInt(user.id.replace('user-voter-', '')) <= 18 && user.id !== 'user-voter-01' && user.id !== 'user-voter-03' && user.id !== 'user-voter-04');

    return {
      id: `eligibility-${user.id}`,
      voterId: user.id,
      electionId,
      isEligible: isApproved,
      tokenIssued: hasVoted,
      hasVoted: hasVoted,
      votedAt: hasVoted ? new Date(Date.now() - Math.floor(Math.random() * 5 * 3600 * 1000)).toISOString() : null,
      receiptCode: hasVoted ? `ELEDA-VOTE-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : null,
    };
  });

  // Pre-seed some anonymous ballots matching the hasVoted voters
  // (NOTE: In strict compliance with Section 5, anonymous ballots have NO link to user_id!)
  const anonymousBallots: AnonymousBallot[] = [];
  const ballotSelections: BallotSelection[] = [];

  const votedVoters = votingStatus.filter(v => v.hasVoted);
  votedVoters.forEach((vs, i) => {
    const ballotId = `ballot-${(i + 1).toString().padStart(4, '0')}`;
    const nullifierHash = `nullifier_hash_seed_${(i + 1) * 987654321}`;
    const castAt = vs.votedAt || new Date(Date.now() - 3600 * 1000).toISOString();
    const receiptCode = vs.receiptCode || `ELEDA-VOTE-SAMPLE-${i}`;
    const auditHash = `audit_chain_block_${i + 1}_hash`;

    anonymousBallots.push({
      id: ballotId,
      electionId,
      nullifierHash,
      castAt,
      receiptCode,
      auditHash,
    });

    // Realistic vote distribution:
    // Class Gov: distributed across all 5 authentic candidates
    const govCands = ['cand-gov-01', 'cand-gov-02', 'cand-gov-03', 'cand-gov-04', 'cand-gov-05'];
    const govCand = govCands[i % govCands.length];
    // Deputy Gov: cand-dep-01 (Hadiza Oladipupo) or cand-dep-02 (Tina Paul) or abstain
    const depCands = ['cand-dep-01', 'cand-dep-02'];
    const depAbstain = i % 11 === 0;
    const depCand = depAbstain ? null : depCands[i % depCands.length];

    ballotSelections.push(
      { id: `sel-${ballotId}-gov`, ballotId, positionId: 'pos-01-gov', candidateId: govCand, isAbstain: false },
      { id: `sel-${ballotId}-dep`, ballotId, positionId: 'pos-02-dep-gov', candidateId: depCand, isAbstain: depAbstain },
    );
  });

  const auditLogs: AuditLog[] = [
    {
      id: 'log-001',
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      action: 'ELECTION_INITIALIZED',
      actorType: 'SYSTEM',
      actorName: 'System Genesis',
      details: { title: election.title, positionsCount: positions.length },
      ipAddress: '127.0.0.1',
      severity: 'INFO',
    },
    {
      id: 'log-002',
      timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      action: 'CANDIDATES_APPROVED',
      actorType: 'ADMIN',
      actorId: 'user-admin-01',
      actorName: 'Chief Electoral Commissioner (Admin)',
      details: { approvedCandidatesCount: candidates.length },
      ipAddress: '197.210.65.12',
      severity: 'INFO',
    },
    {
      id: 'log-003',
      timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      action: 'VOTING_OPENED_SCHEDULED',
      actorType: 'ADMIN',
      actorId: 'user-admin-01',
      actorName: 'Chief Electoral Commissioner (Admin)',
      details: { status: 'VOTING_LIVE', openTime: election.startTime },
      ipAddress: '197.210.65.12',
      severity: 'CRITICAL',
    },
    {
      id: 'log-004',
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      action: 'BALLOT_BATCH_CAST',
      actorType: 'SYSTEM',
      actorName: 'Cryptographic Engine',
      details: { ballotsCastSoFar: anonymousBallots.length },
      ipAddress: '127.0.0.1',
      severity: 'INFO',
    },
  ];

  return {
    election,
    positions,
    candidates,
    users,
    votingStatus,
    deviceVotingStatus: [],   // device-fingerprint based tracking
    anonymousBallots,
    ballotSelections,
    auditLogs,
    lastAuditHash: 'genesis_block_audit_hash_00000000',
  };
}

// In-memory + File Persistence Singleton
class DatabaseStore {
  private state: DatabaseState;
  private initialized = false;

  constructor() {
    this.state = this.loadOrInitialize();
  }

  private loadOrInitialize(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // If running on Vercel and /tmp DB does not exist, copy from bundled data/ folder
      if (isVercel && !fs.existsSync(DB_FILE) && fs.existsSync(BUNDLED_DB_FILE)) {
        try {
          fs.copyFileSync(BUNDLED_DB_FILE, DB_FILE);
        } catch (copyErr) {
          console.warn('Could not copy bundled DB to /tmp:', copyErr);
        }
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.election && parsed.positions && parsed.candidates) {
          // Migrate: add deviceVotingStatus if missing (backward compat)
          if (!parsed.deviceVotingStatus) {
            parsed.deviceVotingStatus = [];
          }
          this.initialized = true;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read db file, initializing with seed data:', e);
    }

    const seed = createInitialSeedData();
    this.save(seed);
    this.initialized = true;
    return seed;
  }

  private save(stateToSave?: DatabaseState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(stateToSave || this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public resetToSeed(): DatabaseState {
    this.state = createInitialSeedData();
    this.save();
    return this.state;
  }

  // --- Election Operations ---
  public getElection(): Election {
    return this.state.election;
  }

  public updateElection(updates: Partial<Election>, actorName?: string): Election {
    this.state.election = {
      ...this.state.election,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.addAuditLog({
      action: 'ELECTION_SETTINGS_UPDATED',
      actorType: 'ADMIN',
      actorName: actorName || 'System Admin',
      details: updates,
      severity: 'WARNING',
    });

    this.save();
    return this.state.election;
  }

  public setVotingStatus(status: Election['status'], actorName?: string): Election {
    this.state.election.status = status;
    this.state.election.updatedAt = new Date().toISOString();

    this.addAuditLog({
      action: `VOTING_STATUS_CHANGED_${status}`,
      actorType: 'ADMIN',
      actorName: actorName || 'System Admin',
      details: { newStatus: status },
      severity: 'CRITICAL',
    });

    this.save();
    return this.state.election;
  }

  // --- Positions & Candidates ---
  public getPositions(): ElectionPosition[] {
    return [...this.state.positions].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public addPosition(pos: Omit<ElectionPosition, 'id' | 'createdAt'>): ElectionPosition {
    const newPos: ElectionPosition = {
      ...pos,
      id: `pos-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.positions.push(newPos);
    this.save();
    return newPos;
  }

  public updatePosition(id: string, updates: Partial<ElectionPosition>): ElectionPosition | null {
    const idx = this.state.positions.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.state.positions[idx] = { ...this.state.positions[idx], ...updates };
    this.save();
    return this.state.positions[idx];
  }

  public deletePosition(id: string): boolean {
    if (this.state.election.status === 'VOTING_LIVE') {
      throw new Error('Cannot delete positions while voting is active!');
    }
    this.state.positions = this.state.positions.filter(p => p.id !== id);
    this.state.candidates = this.state.candidates.filter(c => c.positionId !== id);
    this.save();
    return true;
  }

  public getCandidates(positionId?: string): Candidate[] {
    if (positionId) {
      return this.state.candidates.filter(c => c.positionId === positionId);
    }
    return this.state.candidates;
  }

  public addCandidate(cand: Omit<Candidate, 'id' | 'createdAt'>): Candidate {
    if (this.state.election.status === 'VOTING_LIVE') {
      throw new Error('Cannot add new candidates once voting has commenced.');
    }
    const newCand: Candidate = {
      ...cand,
      id: `cand-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.candidates.push(newCand);
    this.save();
    return newCand;
  }

  public updateCandidate(id: string, updates: Partial<Candidate>): Candidate | null {
    const idx = this.state.candidates.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.state.candidates[idx] = { ...this.state.candidates[idx], ...updates };
    this.save();
    return this.state.candidates[idx];
  }

  public deleteCandidate(id: string): boolean {
    if (this.state.election.status === 'VOTING_LIVE') {
      throw new Error('Cannot remove candidates while voting is active.');
    }
    this.state.candidates = this.state.candidates.filter(c => c.id !== id);
    this.save();
    return true;
  }

  // --- Users & Voters ---
  public getUsers(): User[] {
    return this.state.users;
  }

  public getUserById(id: string): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserByVoterCode(voterCode: string): User | undefined {
    return this.state.users.find(u => u.voterCode.toUpperCase() === voterCode.toUpperCase());
  }

  public addUser(user: Omit<User, 'id' | 'registeredAt'>): User {
    const existingEmail = this.getUserByEmail(user.email);
    if (existingEmail) {
      throw new Error('A voter is already registered with this email address.');
    }

    const existingCode = this.getUserByVoterCode(user.voterCode);
    if (existingCode) {
      throw new Error('This voter registration code has already been registered.');
    }

    const newUser: User = {
      ...user,
      id: `user-voter-${Date.now().toString(36)}`,
      registeredAt: new Date().toISOString(),
      verifiedAt: user.approvalStatus === 'APPROVED' ? new Date().toISOString() : null,
    };

    this.state.users.push(newUser);

    // Create corresponding eligibility record
    this.state.votingStatus.push({
      id: `eligibility-${newUser.id}`,
      voterId: newUser.id,
      electionId: this.state.election.id,
      isEligible: newUser.approvalStatus === 'APPROVED',
      tokenIssued: false,
      hasVoted: false,
    });

    this.addAuditLog({
      action: 'VOTER_REGISTERED',
      actorType: 'VOTER',
      actorId: newUser.id,
      actorName: newUser.fullName,
      details: { email: newUser.email, voterCode: newUser.voterCode },
      severity: 'INFO',
    });

    this.save();
    return newUser;
  }

  public updateVoterApproval(voterId: string, status: User['approvalStatus'], actorName?: string): User | null {
    const user = this.state.users.find(u => u.id === voterId);
    if (!user) return null;

    user.approvalStatus = status;
    if (status === 'APPROVED') {
      user.verifiedAt = new Date().toISOString();
    }

    const eligibility = this.state.votingStatus.find(v => v.voterId === voterId);
    if (eligibility) {
      eligibility.isEligible = (status === 'APPROVED');
    }

    this.addAuditLog({
      action: `VOTER_APPROVAL_${status}`,
      actorType: 'ADMIN',
      actorName: actorName || 'Admin',
      details: { voterId, voterName: user.fullName, voterCode: user.voterCode, status },
      severity: 'WARNING',
    });

    this.save();
    return user;
  }

  public getVoterEligibility(voterId: string): VoterEligibility | undefined {
    return this.state.votingStatus.find(v => v.voterId === voterId);
  }

  // --- Anonymous Voting Engine DB Ops ---

  /**
   * Phase 1: Mark voter as having received token / voted.
   * STRICT ANONYMITY: No link between voterId and nullifierHash is stored in the database!
   */
  public markVoterTokenIssued(voterId: string, receiptCodePlaceholder: string): boolean {
    const eligibility = this.state.votingStatus.find(v => v.voterId === voterId);
    if (!eligibility) {
      throw new Error('Voter eligibility record not found.');
    }
    if (!eligibility.isEligible) {
      throw new Error('Voter is not approved/eligible to vote.');
    }
    if (eligibility.hasVoted || eligibility.tokenIssued) {
      throw new Error('Voter has already been issued a ballot for this election.');
    }

    eligibility.tokenIssued = true;
    eligibility.hasVoted = true;
    eligibility.votedAt = new Date().toISOString();
    eligibility.receiptCode = receiptCodePlaceholder;

    this.addAuditLog({
      action: 'VOTER_BALLOT_TOKEN_ISSUED',
      actorType: 'SYSTEM',
      actorId: voterId,
      details: { timestamp: eligibility.votedAt },
      severity: 'INFO',
    });

    this.save();
    return true;
  }

  // --- Device-Fingerprint Anonymous Voting Engine ---

  /**
   * Look up a device's voting state.
   * Returns undefined if this device has never visited the voting booth.
   */
  public getDeviceVotingStatus(deviceHash: string): DeviceVotingStatus | undefined {
    return this.state.deviceVotingStatus.find(d => d.deviceHash === deviceHash);
  }

  /**
   * Register a device fingerprint hash as "token issued".
   * Called once when the device requests a blinded voting token.
   * Throws if a token was already issued for this device (replay prevention).
   */
  public issueDeviceToken(deviceHash: string, electionId: string): DeviceVotingStatus {
    let record = this.state.deviceVotingStatus.find(d => d.deviceHash === deviceHash);

    if (record) {
      if (record.tokenIssued) {
        throw new Error('A voting token has already been issued for this device. ELEDA 2026 strictly enforces one device, one ballot.');
      }
    } else {
      record = {
        deviceHash,
        electionId,
        positionsVoted: [],
        tokenIssued: false,
        firstSeenAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        spentNullifiers: [],
      };
      this.state.deviceVotingStatus.push(record);
    }

    record.tokenIssued = true;
    record.lastActivityAt = new Date().toISOString();

    this.addAuditLog({
      action: 'DEVICE_BALLOT_TOKEN_ISSUED',
      actorType: 'SYSTEM',
      details: { electionId, deviceHashPrefix: deviceHash.slice(0, 8) + '...' },
      severity: 'INFO',
    });

    this.save();
    return record;
  }

  /**
   * Check whether a device has already voted for a specific position.
   * Used to detect per-position double-vote attempts (a device can still
   * vote if they haven't voted for all positions yet).
   */
  public hasDeviceVotedForPosition(deviceHash: string, positionId: string): boolean {
    const record = this.state.deviceVotingStatus.find(d => d.deviceHash === deviceHash);
    return record ? record.positionsVoted.includes(positionId) : false;
  }

  /**
   * Mark a device's nullifier as spent (global replay prevention).
   */
  public spendDeviceNullifier(deviceHash: string, nullifierHash: string): void {
    const record = this.state.deviceVotingStatus.find(d => d.deviceHash === deviceHash);
    if (record) {
      if (record.spentNullifiers.includes(nullifierHash)) {
        throw new Error('Duplicate submission detected. This voting credential has already been redeemed.');
      }
      record.spentNullifiers.push(nullifierHash);
      record.lastActivityAt = new Date().toISOString();
      this.save();
    }
  }

  /**
   * After successful ballot recording, mark the device as having voted for
   * the submitted positions.  Atomically called inside castAnonymousBallot.
   */
  public markDevicePositionsVoted(deviceHash: string, positionIds: string[]): void {
    const record = this.state.deviceVotingStatus.find(d => d.deviceHash === deviceHash);
    if (record) {
      for (const pid of positionIds) {
        if (!record.positionsVoted.includes(pid)) {
          record.positionsVoted.push(pid);
        }
      }
      record.lastActivityAt = new Date().toISOString();
      // No save() here — called from within castAnonymousBallot which saves
    }
  }

  /**
   * Total number of unique devices that have participated (for turnout stats).
   */
  public getTotalUniqueDevices(): number {
    return this.state.deviceVotingStatus.filter(d => d.positionsVoted.length > 0).length;
  }

  /**
   * Phase 2: Insert anonymous ballot into the secret ballot box.
   * Now also accepts deviceHash to record per-position device tracking.
   * Guarantees nullifier uniqueness (double-spend protection) and zero user linkage.
   */
  public castAnonymousBallot(
    electionId: string,
    nullifierHash: string,
    receiptCode: string,
    selections: { positionId: string; candidateId: string | null; isAbstain?: boolean }[],
    deviceHash?: string
  ): AnonymousBallot {
    // 1. Nullifier double-spend prevention (global)
    const existingBallot = this.state.anonymousBallots.find(b => b.nullifierHash === nullifierHash);
    if (existingBallot) {
      throw new Error('Duplicate submission detected. This voting credential has already been redeemed.');
    }

    // 2. Per-device, per-position double-vote prevention
    if (deviceHash) {
      for (const sel of selections) {
        if (!sel.isAbstain && this.hasDeviceVotedForPosition(deviceHash, sel.positionId)) {
          const pos = this.state.positions.find(p => p.id === sel.positionId);
          throw new Error(
            `Your device has already cast a vote for "${pos?.title || sel.positionId}". One vote per position per device is enforced.`
          );
        }
      }
    }

    // 3. Compute audit chain hash
    const prevAuditHash = this.state.lastAuditHash;
    const ballotId = `ballot-${(this.state.anonymousBallots.length + 1).toString().padStart(4, '0')}`;
    const castAt = new Date().toISOString();
    const auditHash = `${prevAuditHash.slice(0, 8)}-${nullifierHash.slice(0, 8)}-${Date.now()}`;

    const newBallot: AnonymousBallot = {
      id: ballotId,
      electionId,
      nullifierHash,
      castAt,
      receiptCode,
      auditHash,
    };

    this.state.anonymousBallots.push(newBallot);
    this.state.lastAuditHash = auditHash;

    // 4. Record individual selections
    for (const sel of selections) {
      this.state.ballotSelections.push({
        id: `sel-${ballotId}-${sel.positionId}`,
        ballotId,
        positionId: sel.positionId,
        candidateId: sel.candidateId,
        isAbstain: !!sel.isAbstain,
      });
    }

    // 5. Mark device as having voted for each position (atomic with ballot)
    if (deviceHash) {
      this.markDevicePositionsVoted(
        deviceHash,
        selections.map(s => s.positionId)
      );
    }

    this.addAuditLog({
      action: 'ANONYMOUS_BALLOT_CAST',
      actorType: 'SYSTEM',
      details: { ballotId, receiptCode, auditHash },
      severity: 'INFO',
    });

    this.save();
    return newBallot;
  }

  public verifyReceiptCode(receiptCode: string): { found: boolean; ballot?: AnonymousBallot } {
    const ballot = this.state.anonymousBallots.find(
      b => b.receiptCode.toUpperCase() === receiptCode.toUpperCase().trim()
    );
    if (ballot) {
      return { found: true, ballot };
    }
    return { found: false };
  }

  // --- Results Calculation & Statistics ---
  public calculateElectionResults(): ElectionResults {
    const election = this.state.election;
    const positions = this.getPositions();
    const candidates = this.getCandidates();
    const ballots = this.state.anonymousBallots;
    const selections = this.state.ballotSelections;
    const users = this.state.users.filter(u => u.role === 'VOTER');
    const verifiedVoters = users.filter(u => u.approvalStatus === 'APPROVED');

    const totalBallotsCast = ballots.length;
    const totalVerified = verifiedVoters.length;
    const turnoutPercentage = totalVerified > 0 ? Number(((totalBallotsCast / totalVerified) * 100).toFixed(1)) : 0;

    const positionResults: PositionResult[] = positions.map(pos => {
      const posCandidates = candidates.filter(c => c.positionId === pos.id);
      const posSelections = selections.filter(s => s.positionId === pos.id);

      const totalVotesCast = posSelections.length;
      let totalAbstentions = 0;

      const candidateCounts: Record<string, number> = {};
      posCandidates.forEach(c => {
        candidateCounts[c.id] = 0;
      });

      posSelections.forEach(s => {
        if (s.isAbstain || !s.candidateId) {
          totalAbstentions++;
        } else if (candidateCounts[s.candidateId] !== undefined) {
          candidateCounts[s.candidateId]++;
        }
      });

      const candResults = posCandidates.map(c => {
        const count = candidateCounts[c.id] || 0;
        const percentage = totalVotesCast > 0 ? Number(((count / totalVotesCast) * 100).toFixed(1)) : 0;
        return {
          candidateId: c.id,
          candidateNumber: c.candidateNumber,
          fullName: c.fullName,
          photoUrl: c.photoUrl,
          campaignTagline: c.campaignTagline,
          voteCount: count,
          percentage,
          isWinner: false,
        };
      });

      // Sort by vote count descending
      candResults.sort((a, b) => b.voteCount - a.voteCount);

      // Determine winner or tie
      let isTie = false;
      let tieCandidates: string[] = [];
      let winner = null;

      if (candResults.length > 0 && candResults[0].voteCount > 0) {
        if (candResults.length > 1 && candResults[0].voteCount === candResults[1].voteCount) {
          isTie = true;
          tieCandidates = [candResults[0].candidateId, candResults[1].candidateId];
        } else {
          candResults[0].isWinner = true;
          winner = {
            candidateId: candResults[0].candidateId,
            candidateNumber: candResults[0].candidateNumber,
            fullName: candResults[0].fullName,
            photoUrl: candResults[0].photoUrl,
            voteCount: candResults[0].voteCount,
            percentage: candResults[0].percentage,
          };
        }
      }

      return {
        positionId: pos.id,
        positionTitle: pos.title,
        totalVotesCast,
        totalAbstentions,
        candidates: candResults,
        isTie,
        tieCandidates,
        winner,
      };
    });

    const isVotingClosed = election.status === 'VOTING_CLOSED' || election.status === 'RESULTS_PUBLISHED';
    const canViewCandidateScores =
      election.resultsVisibility === 'LIVE_COUNTS' ||
      (election.resultsVisibility === 'PUBLIC_AFTER_CLOSE' && isVotingClosed) ||
      election.status === 'RESULTS_PUBLISHED';

    const canViewTurnout = election.resultsVisibility !== 'HIDDEN';

    return {
      electionId: election.id,
      calculatedAt: new Date().toISOString(),
      totalRegisteredVoters: users.length,
      totalVerifiedVoters: totalVerified,
      totalBallotsCast,
      turnoutPercentage,
      positions: positionResults,
      status: election.status,
      resultsVisibility: election.resultsVisibility,
      canViewCandidateScores,
      canViewTurnout,
    };
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return [...this.state.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp' | 'ipAddress'> & { ipAddress?: string }): AuditLog {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ipAddress: log.ipAddress || '127.0.0.1',
      ...log,
    };
    this.state.auditLogs.unshift(newLog);
    // Keep max 1000 logs in storage
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 1000);
    }
    this.save();
    return newLog;
  }
}

// Global Singleton pattern for Next.js hot-reloading
const globalForDb = globalThis as unknown as { eledaDb: DatabaseStore };
export const db = globalForDb.eledaDb || new DatabaseStore();
if (process.env.NODE_ENV !== 'production') globalForDb.eledaDb = db;
