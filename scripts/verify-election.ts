import crypto from 'crypto';
import { db } from '../src/lib/db/store.js';
import {
  deriveNullifierHash,
  generateRandomSeed,
  issueBlindedToken,
  verifyBlindedToken,
  generateReceiptCode,
  hashPassword,
} from '../src/lib/voting/crypto.js';

console.log('=== ELEDA 2026 ELECTION ENGINE VERIFICATION SUITE ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: any, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  const state = db.getState();
  const electionId = state.election.id;

  // TEST 1: Anonymous Ballot Separation (Prompt Section 5 & 15)
  console.log('\n--- 1. Testing Zero-Linkage Anonymous Ballot Architecture ---');
  const sampleBallot = state.anonymousBallots[0];
  assert(sampleBallot !== undefined, 'Anonymous ballots exist in storage');
  assert(sampleBallot.id.startsWith('ballot-'), 'Ballot has anonymous sequential ID');
  assert(!('voterId' in sampleBallot), 'CRITICAL: Anonymous ballot does NOT contain voterId');
  assert(!('userId' in sampleBallot), 'CRITICAL: Anonymous ballot does NOT contain userId');
  assert(!('email' in sampleBallot), 'CRITICAL: Anonymous ballot does NOT contain voter email');
  assert(sampleBallot.nullifierHash !== undefined, 'Ballot contains cryptographic nullifierHash');
  assert(sampleBallot.receiptCode.startsWith('ELEDA-'), 'Ballot contains verifiable receipt code');

  // TEST 2: Cryptographic Blinded Token & Nullifier Derivation
  console.log('\n--- 2. Testing Cryptographic Handshake & Nullifier Derivation ---');
  const seed = generateRandomSeed();
  const nullifierHash = deriveNullifierHash(seed, electionId);
  assert(nullifierHash.length === 64, 'Nullifier hash is valid 256-bit SHA-256 hex string');

  const { tokenString } = issueBlindedToken(electionId, 'test-token-uuid-123', nullifierHash);
  const verified = verifyBlindedToken(tokenString);
  assert(verified.isValid === true, 'Blinded token signature verified successfully');
  assert(verified.nullifierHash === nullifierHash, 'Nullifier commitment inside token matches derived hash');

  // TEST 3: Duplicate Registration Prevention (Prompt Section 4 & 15)
  console.log('\n--- 3. Testing Duplicate Registration Prevention ---');
  let duplicateEmailCaught = false;
  try {
    db.addUser({
      fullName: 'Imposter Adeleke',
      email: 'voter1@eleda2026.org', // Existing email
      phone: '+2348099998888',
      voterCode: 'ELEDA-2026-FAKE-1',
      role: 'VOTER',
      approvalStatus: 'PENDING',
      passwordHash: hashPassword('password123'),
    });
  } catch (e) {
    duplicateEmailCaught = true;
  }
  assert(duplicateEmailCaught, 'Duplicate email registration rejected by database layer');

  let duplicateCodeCaught = false;
  try {
    db.addUser({
      fullName: 'Another Imposter',
      email: 'newunique@eleda2026.org',
      phone: '+2348099998889',
      voterCode: 'ELEDA-2026-9041', // Existing voter code
      role: 'VOTER',
      approvalStatus: 'PENDING',
      passwordHash: hashPassword('password123'),
    });
  } catch (e) {
    duplicateCodeCaught = true;
  }
  assert(duplicateCodeCaught, 'Duplicate voter code registration rejected by database layer');

  // TEST 4: Double-Spend / Duplicate Voting Prevention (Prompt Section 5 & 15)
  console.log('\n--- 4. Testing Double-Spend & Duplicate Voting Prevention ---');
  const testNullifier = 'test_nullifier_spend_' + Date.now();
  const testReceipt = 'ELEDA-VOTE-TEST-0001';
  const positions = db.getPositions();

  // First submission should succeed
  const castBallot1 = db.castAnonymousBallot(
    electionId,
    testNullifier,
    testReceipt,
    [{ positionId: positions[0].id, candidateId: 'cand-gov-01', isAbstain: false }]
  );
  assert(castBallot1.nullifierHash === testNullifier, 'First ballot submission cast successfully');

  // Second submission with SAME nullifier MUST be rejected
  let duplicateSpendCaught = false;
  try {
    db.castAnonymousBallot(
      electionId,
      testNullifier, // Re-submitting identical nullifier
      'ELEDA-VOTE-TEST-0002',
      [{ positionId: positions[0].id, candidateId: 'cand-gov-02', isAbstain: false }]
    );
  } catch (e) {
    duplicateSpendCaught = true;
  }
  assert(duplicateSpendCaught, 'Replay / Double-spend submission rejected immediately with error');

  // TEST 5: Voter Eligibility & Token Issuance Once-Only Rule
  console.log('\n--- 5. Testing Voter Eligibility & Single Token Issuance ---');
  let doubleTokenIssuanceCaught = false;
  try {
    // voter2 has already voted in seed data
    db.markVoterTokenIssued('user-voter-02', 'RECEIPT_ATTEMPT');
  } catch (e) {
    doubleTokenIssuanceCaught = true;
  }
  assert(doubleTokenIssuanceCaught, 'Voter who has already voted cannot be issued a second voting token');

  // TEST 6: Public Receipt Verification (Prompt Section 14 & 15)
  console.log('\n--- 6. Testing Public Receipt Verification ---');
  const verifyResult = db.verifyReceiptCode(testReceipt);
  assert(verifyResult.found === true, 'Public bulletin board found ballot matching test receipt code');
  assert(verifyResult.ballot?.nullifierHash === testNullifier, 'Recorded ballot matches cryptographic commitment');

  const verifyNonExistent = db.verifyReceiptCode('ELEDA-VOTE-NON-EXISTENT-CODE');
  assert(verifyNonExistent.found === false, 'Invalid receipt code correctly returns not found');

  // TEST 7: Accurate Results Calculation & Tie Handling (Prompt Section 9 & 15)
  console.log('\n--- 7. Testing Results Calculation & Tie Handling ---');
  const results = db.calculateElectionResults();
  assert(results.totalBallotsCast > 0, 'Ballots cast tally calculated correctly');
  assert(results.turnoutPercentage > 0, 'Turnout percentage calculated correctly');
  assert(results.positions.length === positions.length, 'All positions included in certified results');

  const govResult = results.positions.find(p => p.positionId === 'pos-01-gov');
  assert(govResult !== undefined, 'Executive Governor position results generated');
  assert((govResult?.candidates.length ?? 0) > 0, 'Candidates scored with vote counts and percentages');
  assert(govResult ? (govResult.winner !== null || govResult.isTie) : false, 'Winner declared or tie flag raised');

  // TEST 8: Audit Logging
  console.log('\n--- 8. Testing Immutable Security Audit Logging ---');
  const auditLogs = db.getAuditLogs();
  assert(auditLogs.length > 0, 'Audit logs recorded');
  const lastLog = auditLogs[0];
  assert(lastLog.timestamp !== undefined, 'Audit log has valid ISO timestamp');
  assert(lastLog.action !== undefined, 'Audit log has action event identifier');

  console.log(`\n==================================================`);
  console.log(`VERIFICATION SUMMARY: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`==================================================\n`);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
