import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/store';
import {
  verifyBlindedToken,
  deriveNullifierHash,
  generateReceiptCode,
} from '@/lib/voting/crypto';
import { BallotSubmissionPayload } from '@/types/election';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { electionId, votingToken, nullifierSeed, selections, deviceHash } =
      body as BallotSubmissionPayload & { deviceHash?: string };

    // 1. Basic Payload Validation
    if (!electionId || !votingToken || !nullifierSeed || !Array.isArray(selections)) {
      return NextResponse.json(
        {
          error:
            'Invalid ballot submission payload. Missing cryptographic credentials or selections.',
        },
        { status: 400 }
      );
    }

    const election = db.getElection();
    if (election.id !== electionId) {
      return NextResponse.json({ error: 'Invalid election identifier.' }, { status: 400 });
    }

    if (election.status !== 'VOTING_LIVE') {
      return NextResponse.json(
        { error: `Voting is not open. Election status is currently: ${election.status}.` },
        { status: 403 }
      );
    }

    // 2. Cryptographic Token Verification
    const tokenResult = verifyBlindedToken(votingToken);
    if (!tokenResult.isValid || !tokenResult.nullifierHash) {
      return NextResponse.json(
        { error: tokenResult.error || 'Invalid or manipulated voting token.' },
        { status: 401 }
      );
    }

    if (tokenResult.electionId !== electionId) {
      return NextResponse.json(
        { error: 'Voting token was issued for a different election.' },
        { status: 401 }
      );
    }

    // 3. Nullifier Proof Check
    const derivedNullifierHash = deriveNullifierHash(nullifierSeed, electionId);
    if (derivedNullifierHash !== tokenResult.nullifierHash) {
      return NextResponse.json(
        {
          error:
            'Cryptographic proof failed: Nullifier seed does not correspond to the authorized token commitment.',
        },
        { status: 401 }
      );
    }

    // 4. Per-device position double-vote check (before expensive selection validation)
    if (deviceHash) {
      const deviceRecord = db.getDeviceVotingStatus(deviceHash);
      if (deviceRecord) {
        for (const sel of selections) {
          if (!sel.isAbstain && deviceRecord.positionsVoted.includes(sel.positionId)) {
            const positions = db.getPositions();
            const pos = positions.find(p => p.id === sel.positionId);
            return NextResponse.json(
              {
                error: `Your device has already voted for "${pos?.title || sel.positionId}". One vote per device per position is enforced.`,
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // 5. Validate Selections
    const positions = db.getPositions();
    const candidates = db.getCandidates();

    const selectedPositionIds = new Set<string>();

    for (const sel of selections) {
      const position = positions.find(p => p.id === sel.positionId);
      if (!position) {
        return NextResponse.json(
          { error: `Invalid position contested: ${sel.positionId}` },
          { status: 400 }
        );
      }

      if (selectedPositionIds.has(sel.positionId)) {
        return NextResponse.json(
          {
            error: `Multiple votes detected for position: "${position.title}". Only one vote per position is permitted.`,
          },
          { status: 400 }
        );
      }
      selectedPositionIds.add(sel.positionId);

      if (sel.isAbstain || !sel.candidateId) {
        if (!position.allowAbstain && !election.allowAbstentions) {
          return NextResponse.json(
            {
              error: `Abstentions are not permitted for position: "${position.title}". You must select a candidate.`,
            },
            { status: 400 }
          );
        }
      } else {
        const candidate = candidates.find(
          c => c.id === sel.candidateId && c.positionId === position.id
        );
        if (!candidate) {
          return NextResponse.json(
            {
              error: `Candidate with ID "${sel.candidateId}" does not exist for position "${position.title}".`,
            },
            { status: 400 }
          );
        }
      }
    }

    // 6. Generate Official Receipt Code
    const tempBallotId = crypto.randomUUID();
    const castAt = new Date().toISOString();
    const receiptCode = generateReceiptCode(tempBallotId, derivedNullifierHash, castAt);

    // 7. Atomic Transaction: Cast anonymous ballot (includes device position tracking)
    const ballot = db.castAnonymousBallot(
      electionId,
      derivedNullifierHash,
      receiptCode,
      selections,
      deviceHash   // passed through for per-position device guard
    );

    return NextResponse.json({
      success: true,
      receiptCode: ballot.receiptCode,
      castAt: ballot.castAt,
      auditHash: ballot.auditHash,
      message:
        'Your anonymous ballot has been securely cast and permanently recorded on the public cryptographic ledger.',
    });
  } catch (error: any) {
    const isDuplicate =
      error.message?.includes('Duplicate submission') ||
      error.message?.includes('already been redeemed') ||
      error.message?.includes('already cast a vote');
    return NextResponse.json(
      { error: error.message || 'Ballot submission failed.' },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
