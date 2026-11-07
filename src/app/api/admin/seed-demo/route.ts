import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/store';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin credentials required.' }, { status: 403 });
    }

    const { action } = await req.json();

    if (action === 'RESET_DATABASE') {
      db.resetToSeed();
      db.addAuditLog({
        action: 'DATABASE_RESET_TO_SEED',
        actorType: 'ADMIN',
        actorId: user.id,
        actorName: user.fullName,
        details: { resetAt: new Date().toISOString() },
        severity: 'CRITICAL',
      });

      return NextResponse.json({
        success: true,
        message: 'Database has been successfully reset to initial pristine demo state.',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
