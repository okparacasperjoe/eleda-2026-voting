import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/store';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const eligibility = db.getVoterEligibility(user.id);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        voterCode: user.voterCode,
        role: user.role,
        approvalStatus: user.approvalStatus,
        registeredAt: user.registeredAt,
        verifiedAt: user.verifiedAt,
      },
      eligibility: eligibility
        ? {
            isEligible: eligibility.isEligible,
            hasVoted: eligibility.hasVoted,
            votedAt: eligibility.votedAt,
            receiptCode: eligibility.receiptCode,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
