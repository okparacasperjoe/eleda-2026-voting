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

    const positions = db.getPositions();
    return NextResponse.json({ positions });
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
    const { title, description, orderIndex, allowAbstain } = body;

    if (!title) {
      return NextResponse.json({ error: 'Position title is required.' }, { status: 400 });
    }

    const newPosition = db.addPosition({
      electionId: db.getElection().id,
      title: title.trim(),
      description: description || '',
      orderIndex: Number(orderIndex) || db.getPositions().length + 1,
      allowAbstain: allowAbstain !== undefined ? Boolean(allowAbstain) : true,
      maxSelections: 1,
    });

    db.addAuditLog({
      action: 'POSITION_CREATED',
      actorType: 'ADMIN',
      actorId: admin.id,
      actorName: admin.fullName,
      details: { positionId: newPosition.id, title: newPosition.title },
      severity: 'INFO',
    });

    return NextResponse.json({ success: true, position: newPosition });
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
      return NextResponse.json({ error: 'Position ID is required.' }, { status: 400 });
    }

    const updated = db.updatePosition(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Position not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, position: updated });
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
      return NextResponse.json({ error: 'Position ID required.' }, { status: 400 });
    }

    db.deletePosition(id);

    return NextResponse.json({ success: true, message: 'Position deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
