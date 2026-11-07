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

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, status, resultsVisibility, startTime, endTime, timezone, reason, allowAbstentions } = body;

    const currentElection = db.getElection();

    switch (action) {
      case 'SET_STATUS': {
        if (!status) {
          return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
        }
        const updated = db.setVotingStatus(status, admin.fullName);
        return NextResponse.json({ success: true, election: updated });
      }

      case 'OPEN_VOTING': {
        const updated = db.updateElection(
          {
            status: 'VOTING_LIVE',
            isEmergencyPaused: false,
            emergencyPauseReason: null,
          },
          admin.fullName
        );
        return NextResponse.json({
          success: true,
          message: 'Voting is now officially LIVE.',
          election: updated,
        });
      }

      case 'PAUSE_VOTING': {
        const updated = db.updateElection(
          {
            status: 'VOTING_PAUSED',
          },
          admin.fullName
        );
        return NextResponse.json({
          success: true,
          message: 'Voting has been temporarily paused.',
          election: updated,
        });
      }

      case 'EMERGENCY_SUSPEND': {
        const pauseReason = reason || 'Emergency suspension invoked by the Chief Electoral Commissioner.';
        const updated = db.updateElection(
          {
            status: 'VOTING_PAUSED',
            isEmergencyPaused: true,
            emergencyPauseReason: pauseReason,
          },
          admin.fullName
        );

        db.addAuditLog({
          action: 'EMERGENCY_VOTING_SUSPENSION_TRIGGERED',
          actorType: 'ADMIN',
          actorId: admin.id,
          actorName: admin.fullName,
          details: { reason: pauseReason, timestamp: new Date().toISOString() },
          severity: 'CRITICAL',
        });

        return NextResponse.json({
          success: true,
          message: 'Emergency suspension activated. All ballot submissions are halted immediately.',
          election: updated,
        });
      }

      case 'CLOSE_VOTING': {
        const updated = db.updateElection(
          {
            status: 'VOTING_CLOSED',
            isEmergencyPaused: false,
          },
          admin.fullName
        );

        db.addAuditLog({
          action: 'VOTING_OFFICIALLY_CLOSED',
          actorType: 'ADMIN',
          actorId: admin.id,
          actorName: admin.fullName,
          details: { closedAt: new Date().toISOString() },
          severity: 'CRITICAL',
        });

        return NextResponse.json({
          success: true,
          message: 'Voting is officially closed. Ballots are locked for reconciliation.',
          election: updated,
        });
      }

      case 'UPDATE_SETTINGS': {
        const updates: any = {};
        if (resultsVisibility) updates.resultsVisibility = resultsVisibility;
        if (startTime) updates.startTime = startTime;
        if (endTime) updates.endTime = endTime;
        if (timezone) updates.timezone = timezone;
        if (allowAbstentions !== undefined) updates.allowAbstentions = Boolean(allowAbstentions);

        const updated = db.updateElection(updates, admin.fullName);
        return NextResponse.json({
          success: true,
          message: 'Election settings updated successfully.',
          election: updated,
        });
      }

      case 'PUBLISH_RESULTS': {
        const updated = db.updateElection(
          {
            status: 'RESULTS_PUBLISHED',
            resultsVisibility: 'LIVE_COUNTS',
          },
          admin.fullName
        );

        db.addAuditLog({
          action: 'FINAL_RESULTS_PUBLISHED',
          actorType: 'ADMIN',
          actorId: admin.id,
          actorName: admin.fullName,
          details: { publishedAt: new Date().toISOString() },
          severity: 'CRITICAL',
        });

        return NextResponse.json({
          success: true,
          message: 'Final results have been certified and published to the public.',
          election: updated,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown administrative action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Operation failed.' }, { status: 500 });
  }
}
