import { NextResponse } from 'next/server';
import { getSessionCookieOptions } from '@/lib/auth/session';

export async function POST() {
  const cookieOpts = getSessionCookieOptions();
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.set(cookieOpts.name, '', { ...cookieOpts, maxAge: 0 });
  return response;
}
