import crypto from 'crypto';

const MASTER_ELECTION_SECRET = process.env.ELECTION_SECRET || 'eleda-2026-super-secure-cryptographic-master-key-xyz987';

/**
 * Hash a raw device fingerprint string into an irreversible HMAC digest.
 * The result is stored server-side as the anonymous device identifier.
 * The raw fingerprint is NEVER persisted.
 */
export function hashDeviceFingerprint(rawFingerprint: string): string {
  return crypto
    .createHmac('sha256', MASTER_ELECTION_SECRET + ':device-id')
    .update(rawFingerprint)
    .digest('hex');
}
const TOKEN_EXPIRY_MINUTES = 60; // 1 hour token validity window

/**
 * Hash password with SHA-256 and deterministic salt
 */
export function hashPassword(password: string): string {
  const salt = 'eleda-salt-2026';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Generate a random cryptographic 256-bit seed
 */
export function generateRandomSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Derive a public nullifier hash from a private nullifier seed and election ID.
 * The server stores only this hash in `anonymous_ballots` upon submission.
 * This guarantees double-spend prevention without linking to voter profile.
 */
export function deriveNullifierHash(nullifierSeed: string, electionId: string): string {
  return crypto
    .createHmac('sha256', MASTER_ELECTION_SECRET)
    .update(`${electionId}:${nullifierSeed}`)
    .digest('hex');
}

/**
 * Issue a blinded voting token signature
 */
export function issueBlindedToken(electionId: string, tokenId: string, nullifierHash: string): {
  tokenString: string;
  expiresAt: string;
} {
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const payload = `${electionId}|${tokenId}|${nullifierHash}|${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', MASTER_ELECTION_SECRET)
    .update(payload)
    .digest('hex');

  const tokenString = Buffer.from(JSON.stringify({
    payload,
    signature,
  })).toString('base64');

  return { tokenString, expiresAt };
}

/**
 * Verify a blinded voting token's signature and expiration
 */
export function verifyBlindedToken(tokenString: string): {
  isValid: boolean;
  electionId?: string;
  tokenId?: string;
  nullifierHash?: string;
  expiresAt?: string;
  error?: string;
} {
  try {
    const decoded = JSON.parse(Buffer.from(tokenString, 'base64').toString('utf8'));
    const { payload, signature } = decoded;

    if (!payload || !signature) {
      return { isValid: false, error: 'Malformed voting token' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', MASTER_ELECTION_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'Cryptographic signature mismatch on voting token' };
    }

    const [electionId, tokenId, nullifierHash, expiresAt] = payload.split('|');

    if (new Date(expiresAt).getTime() < Date.now()) {
      return { isValid: false, error: 'Voting token has expired. Request a new ballot token.' };
    }

    return {
      isValid: true,
      electionId,
      tokenId,
      nullifierHash,
      expiresAt,
    };
  } catch (err: any) {
    return { isValid: false, error: 'Invalid token format: ' + err.message };
  }
}

/**
 * Generate a clean, verifiable digital voting receipt code (e.g. ELEDA-RCPT-7F2A-89DE)
 */
export function generateReceiptCode(ballotId: string, nullifierHash: string, castAt: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${ballotId}:${nullifierHash}:${castAt}`)
    .digest('hex')
    .toUpperCase();
  
  return `ELEDA-VOTE-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
}

/**
 * Compute chained cryptographic audit hash (tamper evidence)
 */
export function computeChainedAuditHash(
  prevHash: string,
  ballotId: string,
  nullifierHash: string,
  castAt: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${prevHash}:${ballotId}:${nullifierHash}:${castAt}`)
    .digest('hex');
}
