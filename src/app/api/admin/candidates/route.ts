import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/store';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return null;
  }
  return user;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const candidates = db.getCandidates();
    const positions = db.getPositions();

    return NextResponse.json({
      candidates,
      positions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const { positionId, candidateNumber, fullName, photoUrl, campaignTagline, campaignDescription, manifesto, approvalStatus } = body;

    if (!positionId || !fullName || !candidateNumber) {
      return NextResponse.json(
        { error: 'Position, Full Name, and Candidate Number are required.' },
        { status: 400 }
      );
    }

    const newCandidate = db.addCandidate({
      positionId,
      candidateNumber: candidateNumber.toString().padStart(2, '0'),
      fullName: fullName.trim(),
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      campaignTagline: campaignTagline || '',
      campaignDescription: campaignDescription || '',
      manifesto: manifesto || '',
      approvalStatus: approvalStatus || 'APPROVED',
    });

    db.addAuditLog({
      action: 'CANDIDATE_CREATED',
      actorType: 'ADMIN',
      actorId: admin.id,
      actorName: admin.fullName,
      details: { candidateId: newCandidate.id, fullName: newCandidate.fullName, positionId },
      severity: 'INFO',
    });

    return NextResponse.json({ success: true, candidate: newCandidate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Candidate ID is required for updating.' }, { status: 400 });
    }

    const updated = db.updateCandidate(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    db.addAuditLog({
      action: 'CANDIDATE_UPDATED',
      actorType: 'ADMIN',
      actorId: admin.id,
      actorName: admin.fullName,
      details: { candidateId: id, updates },
      severity: 'INFO',
    });

    return NextResponse.json({ success: true, candidate: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Candidate ID required.' }, { status: 400 });
    }

    db.deleteCandidate(id);

    db.addAuditLog({
      action: 'CANDIDATE_DELETED',
      actorType: 'ADMIN',
      actorId: admin.id,
      actorName: admin.fullName,
      details: { candidateId: id },
      severity: 'WARNING',
    });

    return NextResponse.json({ success: true, message: 'Candidate removed successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
