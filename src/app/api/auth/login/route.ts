import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { verifyPassword } from '@/lib/voting/crypto';
import { createSessionToken, getSessionCookieOptions } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body; // identifier can be email or voter code

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Please enter your email or voter registration code and password.' },
        { status: 400 }
      );
    }

    const cleanId = identifier.trim();
    let user = db.getUserByEmail(cleanId);
    if (!user) {
      user = db.getUserByVoterCode(cleanId.toUpperCase());
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid voter identifier or password.' },
        { status: 401 }
      );
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      db.addAuditLog({
        action: 'FAILED_LOGIN_ATTEMPT',
        actorType: 'SYSTEM',
        details: { identifier: cleanId },
        severity: 'WARNING',
      });

      return NextResponse.json(
        { error: 'Invalid voter identifier or password.' },
        { status: 401 }
      );
    }

    const token = createSessionToken(user);
    const cookieOpts = getSessionCookieOptions();

    db.addAuditLog({
      action: user.role === 'ADMIN' ? 'ADMIN_LOGGED_IN' : 'VOTER_LOGGED_IN',
      actorType: user.role === 'ADMIN' ? 'ADMIN' : 'VOTER',
      actorId: user.id,
      actorName: user.fullName,
      details: { email: user.email, voterCode: user.voterCode },
      severity: 'INFO',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        voterCode: user.voterCode,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });

    response.cookies.set(cookieOpts.name, token, cookieOpts);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred during authentication.' },
      { status: 500 }
    );
  }
}
