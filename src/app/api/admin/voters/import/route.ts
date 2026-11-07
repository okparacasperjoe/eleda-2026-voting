import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/store';
import { hashPassword } from '@/lib/voting/crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const { voters, autoApprove } = await req.json();

    if (!Array.isArray(voters) || voters.length === 0) {
      return NextResponse.json(
        { error: 'No voter data provided for import.' },
        { status: 400 }
      );
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const defaultPasswordHash = hashPassword('VoterPassword2026!');

    for (let i = 0; i < voters.length; i++) {
      const row = voters[i];
      const fullName = row.fullName || row['Full Name'] || row.name;
      const email = row.email || row['Email'] || row['Email Address'];
      const phone = row.phone || row['Phone'] || row['Phone Number'] || '+2348000000000';
      const voterCode = (row.voterCode || row['Voter Code'] || row['Registration Code'] || `ELEDA-2026-${Math.floor(1000 + Math.random() * 9000)}`).toString().trim().toUpperCase();

      if (!fullName || !email) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Missing Full Name or Email.`);
        continue;
      }

      // Check duplicates
      if (db.getUserByEmail(email) || db.getUserByVoterCode(voterCode)) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Voter with email "${email}" or code "${voterCode}" already exists.`);
        continue;
      }

      try {
        db.addUser({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          voterCode,
          role: 'VOTER',
          approvalStatus: autoApprove ? 'APPROVED' : 'PENDING',
          passwordHash: defaultPasswordHash,
        });
        importedCount++;
      } catch (err: any) {
        skippedCount++;
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    db.addAuditLog({
      action: 'VOTERS_BULK_IMPORTED',
      actorType: 'ADMIN',
      actorId: user.id,
      actorName: user.fullName,
      details: { importedCount, skippedCount, autoApprove },
      severity: 'INFO',
    });

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      errors: errors.slice(0, 10), // return first 10 errors
      message: `Successfully imported ${importedCount} voter(s). ${skippedCount} skipped.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Bulk import failed.' },
      { status: 500 }
    );
  }
}
