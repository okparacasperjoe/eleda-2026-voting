import crypto from 'crypto';
import { cookies } from 'next/headers';
import { User, UserRole } from '@/types/election';
import { db } from '@/lib/db/store';

const SESSION_SECRET = process.env.SESSION_SECRET || 'eleda-2026-session-jwt-auth-secret-key-12345';
const COOKIE_NAME = 'eleda_session_token';

export interface SessionData {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  expiresAt: number;
}

/**
 * Sign session data into a tamper-proof HMAC token
 */
export function createSessionToken(user: User): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const data: SessionData = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    expiresAt,
  };

  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');

  return `${payload}.${signature}`;
}

/**
 * Verify session token and retrieve SessionData
 */
export function verifySessionToken(token: string): SessionData | null {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) return null;

    const data: SessionData = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (Date.now() > data.expiresAt) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Get current session from incoming request cookies
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Get current user object from database based on session
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  return db.getUserById(session.userId) || null;
}

/**
 * Helper to get the cookie options for setting the session
 */
export function getSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };
}
