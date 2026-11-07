import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/store';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity');
    const search = searchParams.get('search')?.toLowerCase();

    let logs = db.getAuditLogs();

    if (severity && severity !== 'ALL') {
      logs = logs.filter(l => l.severity === severity);
    }

    if (search) {
      logs = logs.filter(
        l =>
          l.action.toLowerCase().includes(search) ||
          l.actorName?.toLowerCase().includes(search) ||
          JSON.stringify(l.details).toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      logs: logs.slice(0, 200),
      totalCount: logs.length,
      lastAuditHash: db.getState().lastAuditHash,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
