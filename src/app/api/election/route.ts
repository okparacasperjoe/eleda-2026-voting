import { NextResponse } from 'next/server';
import { db } from '@/lib/db/store';

export async function GET() {
  try {
    const election = db.getElection();
    const positions = db.getPositions();
    const candidates = db.getCandidates().filter(c => c.approvalStatus === 'APPROVED');

    // Server-side time validation
    const serverTime = new Date().toISOString();
    const isBeforeStart = new Date(serverTime).getTime() < new Date(election.startTime).getTime();
    const isAfterEnd = new Date(serverTime).getTime() > new Date(election.endTime).getTime();

    // Map candidates to their positions for easy frontend rendering
    const positionsWithCandidates = positions.map(pos => ({
      ...pos,
      candidates: candidates.filter(c => c.positionId === pos.id),
    }));

    return NextResponse.json({
      election,
      serverTime,
      isBeforeStart,
      isAfterEnd,
      positions: positionsWithCandidates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch election data' },
      { status: 500 }
    );
  }
}
