import { NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const isAdmin = user?.role === 'ADMIN';

    const fullResults = db.calculateElectionResults();

    // If requester is an admin, they have full visibility into live audit tallies
    if (isAdmin) {
      return NextResponse.json({
        ...fullResults,
        isAdminViewer: true,
      });
    }

    // For public and standard voters, enforce server-side visibility restrictions
    if (!fullResults.canViewCandidateScores) {
      // Obfuscate candidate totals and winners if scores are restricted
      const sanitizedPositions = fullResults.positions.map(pos => ({
        positionId: pos.positionId,
        positionTitle: pos.positionTitle,
        totalVotesCast: fullResults.canViewTurnout ? pos.totalVotesCast : 0,
        candidates: pos.candidates.map(c => ({
          candidateId: c.candidateId,
          candidateNumber: c.candidateNumber,
          fullName: c.fullName,
          photoUrl: c.photoUrl,
          campaignTagline: c.campaignTagline,
          // Hide score totals and winner status
          voteCount: -1,
          percentage: -1,
          isWinner: false,
        })),
        isTie: false,
        winner: null,
      }));

      return NextResponse.json({
        ...fullResults,
        positions: sanitizedPositions,
        isAdminViewer: false,
      });
    }

    return NextResponse.json({
      ...fullResults,
      isAdminViewer: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to calculate election results.' },
      { status: 500 }
    );
  }
}
