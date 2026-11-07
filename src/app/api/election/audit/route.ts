import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';

// GET: Return public cryptographic bulletin board
export async function GET() {
  try {
    const state = db.getState();
    const publicLedger = state.anonymousBallots.map(b => ({
      id: b.id,
      receiptCode: b.receiptCode,
      castAt: b.castAt,
      auditHash: b.auditHash,
    }));

    return NextResponse.json({
      electionId: state.election.id,
      totalRecordedBallots: publicLedger.length,
      lastAuditHash: state.lastAuditHash,
      ledger: publicLedger,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch public audit bulletin board' },
      { status: 500 }
    );
  }
}

// POST: Verify a specific receipt code
export async function POST(req: NextRequest) {
  try {
    const { receiptCode } = await req.json();
    if (!receiptCode) {
      return NextResponse.json({ error: 'Receipt code is required.' }, { status: 400 });
    }

    const verification = db.verifyReceiptCode(receiptCode);
    if (!verification.found || !verification.ballot) {
      return NextResponse.json({
        verified: false,
        message: 'No recorded ballot was found matching this receipt code.',
      });
    }

    return NextResponse.json({
      verified: true,
      message: 'Ballot verified successfully in the official cryptographic tally.',
      ballot: {
        receiptCode: verification.ballot.receiptCode,
        castAt: verification.ballot.castAt,
        auditHash: verification.ballot.auditHash,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
