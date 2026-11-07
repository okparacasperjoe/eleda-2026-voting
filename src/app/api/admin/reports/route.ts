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
    const reportType = searchParams.get('type') || 'final_summary';
    const format = searchParams.get('format') || 'json'; // 'json' or 'csv'

    const state = db.getState();
    const results = db.calculateElectionResults();

    let data: any[] = [];
    let filename = `eleda_report_${reportType}_${Date.now()}`;

    switch (reportType) {
      case 'registered_voters': {
        const voters = state.users.filter(u => u.role === 'VOTER');
        data = voters.map(v => {
          const vs = state.votingStatus.find(s => s.voterId === v.id);
          return {
            'Voter Code': v.voterCode,
            'Full Name': v.fullName,
            'Email Address': v.email,
            'Phone Number': v.phone,
            'Approval Status': v.approvalStatus,
            'Voted': vs?.hasVoted ? 'YES' : 'NO',
            'Registered At': v.registeredAt,
          };
        });
        filename = 'ELEDA_2026_Registered_Voters';
        break;
      }

      case 'approved_voters': {
        const approved = state.users.filter(u => u.role === 'VOTER' && u.approvalStatus === 'APPROVED');
        data = approved.map(v => {
          const vs = state.votingStatus.find(s => s.voterId === v.id);
          return {
            'Voter Code': v.voterCode,
            'Full Name': v.fullName,
            'Email Address': v.email,
            'Phone Number': v.phone,
            'Voted': vs?.hasVoted ? 'YES' : 'NO',
            'Verified At': v.verifiedAt || v.registeredAt,
          };
        });
        filename = 'ELEDA_2026_Approved_Delegates';
        break;
      }

      case 'candidates': {
        data = state.candidates.map(c => {
          const pos = state.positions.find(p => p.id === c.positionId);
          return {
            'Candidate Number': c.candidateNumber,
            'Full Name': c.fullName,
            'Position Contested': pos?.title || 'Unknown',
            'Campaign Tagline': c.campaignTagline,
            'Approval Status': c.approvalStatus,
          };
        });
        filename = 'ELEDA_2026_Candidate_Roster';
        break;
      }

      case 'position_results': {
        data = [];
        results.positions.forEach(p => {
          p.candidates.forEach(c => {
            data.push({
              'Position': p.positionTitle,
              'Candidate Number': c.candidateNumber,
              'Candidate Name': c.fullName,
              'Total Votes': c.voteCount,
              'Vote Share (%)': `${c.percentage}%`,
              'Is Winner': c.isWinner ? 'WINNER' : (p.isTie && p.tieCandidates?.includes(c.candidateId) ? 'TIED' : ''),
            });
          });
          if (p.totalAbstentions > 0) {
            data.push({
              'Position': p.positionTitle,
              'Candidate Number': '-',
              'Candidate Name': 'ABSTAINED',
              'Total Votes': p.totalAbstentions,
              'Vote Share (%)': `${((p.totalAbstentions / p.totalVotesCast) * 100).toFixed(1)}%`,
              'Is Winner': '-',
            });
          }
        });
        filename = 'ELEDA_2026_Position_Results';
        break;
      }

      case 'participation': {
        data = [
          {
            'Metric': 'Total Registered Participants',
            'Value': results.totalRegisteredVoters,
          },
          {
            'Metric': 'Verified Eligible Voters',
            'Value': results.totalVerifiedVoters,
          },
          {
            'Metric': 'Total Anonymous Ballots Cast',
            'Value': results.totalBallotsCast,
          },
          {
            'Metric': 'Turnout Percentage',
            'Value': `${results.turnoutPercentage}%`,
          },
          {
            'Metric': 'Election Status',
            'Value': results.status,
          },
        ];
        filename = 'ELEDA_2026_Voter_Participation';
        break;
      }

      case 'final_summary': {
        data = [
          {
            'Section': 'ELECTION DETAILS',
            'Field': 'Title',
            'Value': state.election.title,
          },
          {
            'Section': 'ELECTION DETAILS',
            'Field': 'Status',
            'Value': state.election.status,
          },
          {
            'Section': 'ELECTION DETAILS',
            'Field': 'Start Time',
            'Value': state.election.startTime,
          },
          {
            'Section': 'ELECTION DETAILS',
            'Field': 'End Time',
            'Value': state.election.endTime,
          },
          {
            'Section': 'TURNOUT',
            'Field': 'Registered Voters',
            'Value': results.totalRegisteredVoters,
          },
          {
            'Section': 'TURNOUT',
            'Field': 'Verified Eligible Voters',
            'Value': results.totalVerifiedVoters,
          },
          {
            'Section': 'TURNOUT',
            'Field': 'Total Ballots Cast',
            'Value': results.totalBallotsCast,
          },
          {
            'Section': 'TURNOUT',
            'Field': 'Voter Turnout',
            'Value': `${results.turnoutPercentage}%`,
          },
        ];

        results.positions.forEach(p => {
          data.push({
            'Section': 'OFFICIAL WINNERS',
            'Field': p.positionTitle,
            'Value': p.winner
              ? `${p.winner.fullName} (${p.winner.voteCount} votes, ${p.winner.percentage}%)`
              : (p.isTie ? 'TIE DETECTED - PENDING REVIEW' : 'NO WINNER DECLARED'),
          });
        });
        filename = 'ELEDA_2026_Certified_Election_Summary';
        break;
      }

      case 'audit_log': {
        data = state.auditLogs.map(l => ({
          'Timestamp': l.timestamp,
          'Action': l.action,
          'Actor Type': l.actorType,
          'Actor Name': l.actorName || 'System',
          'Severity': l.severity,
          'IP Address': l.ipAddress,
          'Details': JSON.stringify(l.details),
        }));
        filename = 'ELEDA_2026_Security_Audit_Log';
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }

    if (format === 'csv') {
      if (data.length === 0) {
        return new NextResponse('', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}.csv"`,
          },
        });
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers
            .map(h => {
              const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
              return `"${val.replace(/"/g, '""')}"`;
            })
            .join(',')
        ),
      ];

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    return NextResponse.json({
      reportType,
      filename,
      generatedAt: new Date().toISOString(),
      rowCount: data.length,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
