import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/store';
import {
  generateRandomSeed,
  deriveNullifierHash,
  issueBlindedToken,
  hashDeviceFingerprint,
} from '@/lib/voting/crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fingerprint } = body as { fingerprint?: string };

    if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length < 20) {
      return NextResponse.json(
        { error: 'Device fingerprint is required. Please ensure your browser is not blocking JavaScript APIs.' },
        { status: 400 }
      );
    }

    const election = db.getElection();

    // 1. Check Election Status
    if (election.status !== 'VOTING_LIVE') {
      return NextResponse.json(
        {
          error: `Voting is currently not open. Current election status: ${election.status.replace(/_/g, ' ')}.`,
        },
        { status: 403 }
      );
    }

    // 2. Server-side Time Verification
    const now = Date.now();
    const startTime = new Date(election.startTime).getTime();
    const endTime = new Date(election.endTime).getTime();

    if (now < startTime) {
      return NextResponse.json(
        { error: 'Voting has not commenced yet according to the official election schedule.' },
        { status: 403 }
      );
    }

    if (now > endTime) {
      return NextResponse.json(
        { error: 'The scheduled voting window has elapsed. Ballot submissions are closed.' },
        { status: 403 }
      );
    }

    // 3. Hash the device fingerprint — this is the anonymous device identifier
    //    The raw fingerprint is NEVER stored. Only the HMAC hash is kept.
    const deviceHash = hashDeviceFingerprint(fingerprint);

    // 4. Check if this device has already received a token (prevents double-token issuance)
    const existingRecord = db.getDeviceVotingStatus(deviceHash);
    if (existingRecord?.tokenIssued) {
      return NextResponse.json(
        {
          error: 'A voting token has already been issued for this device. ELEDA 2026 strictly enforces one device, one ballot per position.',
          alreadyVoted: true,
          positionsVoted: existingRecord.positionsVoted,
        },
        { status: 409 }
      );
    }

    // 5. Cryptographic Handshake:
    //    Generate a private nullifier seed (stays only in client memory + response)
    const nullifierSeed = generateRandomSeed();
    const nullifierHash = deriveNullifierHash(nullifierSeed, election.id);
    const tokenId = crypto.randomUUID();

    const { tokenString, expiresAt } = issueBlindedToken(election.id, tokenId, nullifierHash);

    // 6. Mark device token as issued in the anonymous device registry
    //    STRICT ANONYMITY: deviceHash is NOT stored alongside any ballot data
    db.issueDeviceToken(deviceHash, election.id);

    return NextResponse.json({
      success: true,
      electionId: election.id,
      votingToken: tokenString,
      nullifierSeed,
      deviceHash, // returned so client can include it in submit-ballot for position tracking
      expiresAt,
      message:
        'Anonymous cryptographic voting token issued. Your choices cannot be linked to your device fingerprint.',
    });
  } catch (error: any) {
    const isConflict =
      error.message?.includes('already been issued') ||
      error.message?.includes('already cast');
    return NextResponse.json(
      { error: error.message || 'Failed to issue anonymous voting token.' },
      { status: isConflict ? 409 : 500 }
    );
  }
}
