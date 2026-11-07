import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/store';

// Helper to check admin authorization
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return null;
  }
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized. Administrator access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase() || '';

    const allUsers = db.getUsers().filter(u => u.role === 'VOTER');
    const allEligibility = db.getState().votingStatus;

    let filtered = allUsers;
    if (status && status !== 'ALL') {
      filtered = filtered.filter(u => u.approvalStatus === status);
    }

    if (search) {
      filtered = filtered.filter(
        u =>
          u.fullName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.voterCode.toLowerCase().includes(search) ||
          u.phone.includes(search)
      );
    }

    const votersWithStatus = filtered.map(u => {
      const eligibility = allEligibility.find(e => e.voterId === u.id);
      return {
        ...u,
        hasVoted: !!eligibility?.hasVoted,
        votedAt: eligibility?.votedAt || null,
        isEligible: !!eligibility?.isEligible,
      };
    });

    return NextResponse.json({
      voters: votersWithStatus,
      totalCount: allUsers.length,
      approvedCount: allUsers.filter(u => u.approvalStatus === 'APPROVED').length,
      pendingCount: allUsers.filter(u => u.approvalStatus === 'PENDING').length,
      rejectedCount: allUsers.filter(u => u.approvalStatus === 'REJECTED').length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch voters' }, { status: 500 });
  }
}

// Approve or Reject single or batch voters
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const { voterIds, status } = body; // status: 'APPROVED' | 'REJECTED' | 'PENDING'

    if (!Array.isArray(voterIds) || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json({ error: 'Invalid voter approval payload.' }, { status: 400 });
    }

    const updatedVoters = [];
    for (const id of voterIds) {
      const updated = db.updateVoterApproval(id, status, admin.fullName);
      if (updated) updatedVoters.push(updated);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedVoters.length} voter(s) to ${status}.`,
      updatedCount: updatedVoters.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update voter status' }, { status: 500 });
  }
}
