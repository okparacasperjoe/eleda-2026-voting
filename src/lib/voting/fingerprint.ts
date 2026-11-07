/**
 * ELEDA 2026 — Device Fingerprinting Utility
 *
 * Collects stable browser/device signals client-side, assembles them into a
 * fingerprint string, and derives a short display ID via SHA-256.
 *
 * The raw fingerprint is NEVER stored on the server.  The API hashes it with
 * HMAC(ELECTION_SECRET, fingerprint) so the stored device hash cannot be
 * reversed to identify the browser/user.
 *
 * Signals used (all read-only, non-PII):
 *  - User agent, language, timezone, platform
 *  - Screen dimensions, colour depth, pixel ratio
 *  - Hardware concurrency, device memory, touch points
 *  - Plugin names
 *  - Canvas 2D draw hash (structural fingerprint — no image stored)
 */

export interface DeviceSignals {
  ua: string;
  lang: string;
  tz: string;
  platform: string;
  screenW: number;
  screenH: number;
  colorDepth: number;
  pixelRatio: number;
  cores: number;
  mem: number;
  touch: number;
  plugins: string;
  canvasHash: string;
}

/** Collect all stable device signals (runs only in browser). */
export function collectDeviceSignals(): DeviceSignals {
  // Canvas structural fingerprint — draw a fixed scene and hash its pixels
  let canvasHash = 'no-canvas';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'alphabetic';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#0A1128';
    ctx.fillText('ELEDA-2026-fp', 10, 30);
    ctx.fillStyle = '#D4AF37';
    ctx.font = '10px sans-serif';
    ctx.fillText('🗳️ vote', 80, 20);
    ctx.strokeStyle = 'rgba(10,17,40,0.4)';
    ctx.beginPath();
    ctx.arc(170, 25, 20, 0, Math.PI * 2);
    ctx.stroke();
    canvasHash = canvas.toDataURL().slice(-40); // last 40 chars of data URL
  } catch {
    canvasHash = 'canvas-error';
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    platform?: string;
  };

  return {
    ua: nav.userAgent,
    lang: nav.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: nav.platform || 'unknown',
    screenW: screen.width,
    screenH: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: Math.round((window.devicePixelRatio || 1) * 10) / 10,
    cores: nav.hardwareConcurrency || 0,
    mem: nav.deviceMemory || 0,
    touch: nav.maxTouchPoints || 0,
    plugins: Array.from(nav.plugins || [])
      .map((p) => p.name)
      .slice(0, 5)
      .join(','),
    canvasHash,
  };
}

/** Serialise signals to a stable string for HMAC input. */
export function serialiseFingerprint(signals: DeviceSignals): string {
  return [
    signals.ua,
    signals.lang,
    signals.tz,
    signals.platform,
    signals.screenW,
    signals.screenH,
    signals.colorDepth,
    signals.pixelRatio,
    signals.cores,
    signals.mem,
    signals.touch,
    signals.plugins,
    signals.canvasHash,
  ].join('||');
}

/**
 * Generate a human-readable 12-character Display ID from the fingerprint.
 * This is shown to the user as "Device ID: ABCD-EFGH-1234".
 * It is computed client-side from SHA-256 (not the server HMAC) so the user
 * can see their device is recognised without exposing the secret.
 */
export async function generateDeviceDisplayId(
  fingerprint: string
): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      enc.encode('eleda-display:' + fingerprint)
    );
    const hex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  }
  // Fallback simple hash for environments without SubtleCrypto
  let hash = 5381;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = ((hash << 5) + hash) ^ fingerprint.charCodeAt(i);
    hash = hash >>> 0; // unsigned 32-bit
  }
  const hex = hash.toString(16).toUpperCase().padStart(12, '0');
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}
