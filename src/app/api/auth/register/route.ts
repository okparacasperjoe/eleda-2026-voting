import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/store';
import { hashPassword } from '@/lib/voting/crypto';
import { createSessionToken, getSessionCookieOptions } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, voterCode, password, confirmPassword } = body;

    // Validation
    if (!fullName || !email || !phone || !voterCode || !password) {
      return NextResponse.json(
        { error: 'All fields are required for voter registration.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Password and password confirmation do not match.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    // Clean voter code (e.g. uppercase and trimmed)
    const normalizedCode = voterCode.trim().toUpperCase();

    // Check duplicate email
    if (db.getUserByEmail(email)) {
      return NextResponse.json(
        { error: 'A voter is already registered with this email address.' },
        { status: 409 }
      );
    }

    // Check duplicate code
    if (db.getUserByVoterCode(normalizedCode)) {
      return NextResponse.json(
        { error: 'This unique voter registration code is already registered.' },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    // Auto-approve if code starts with ELEDA-AUTO or if election allows instant verification
    const isAutoApproved = normalizedCode.startsWith('ELEDA-VIP-') || normalizedCode.startsWith('ELEDA-AUTO-');

    const newUser = db.addUser({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      voterCode: normalizedCode,
      role: 'VOTER',
      approvalStatus: isAutoApproved ? 'APPROVED' : 'PENDING',
      passwordHash,
    });

    const token = createSessionToken(newUser);
    const cookieOpts = getSessionCookieOptions();

    const response = NextResponse.json({
      success: true,
      message: isAutoApproved
        ? 'Registration successful and verified! You are eligible to vote.'
        : 'Registration successful! Your credentials are now pending verification by the Electoral Committee.',
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        voterCode: newUser.voterCode,
        role: newUser.role,
        approvalStatus: newUser.approvalStatus,
      },
    });

    response.cookies.set(cookieOpts.name, token, cookieOpts);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
