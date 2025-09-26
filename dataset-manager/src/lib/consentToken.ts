import { createHmac, timingSafeEqual } from 'crypto';

export type ConsentTokenPayload = {
  entryId: string;
  to: string;
  scope?: string; // e.g., all_shots
  iat: number; // issued at (epoch seconds)
  exp: number; // expiry (epoch seconds)
};

function getSecret(): Buffer {
  const secret = process.env.CONSENT_SECRET || process.env.SENDER_EMAIL || '';
  if (!secret) throw new Error('CONSENT_SECRET missing');
  return Buffer.from(secret);
}

function b64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(input: string): Buffer {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64');
}

export function signConsentToken(payload: ConsentTokenPayload): string {
  const secret = getSecret();
  const body = Buffer.from(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(body).digest();
  return b64url(body) + '.' + b64url(sig);
}

export function verifyConsentToken(token: string): ConsentTokenPayload {
  const [p, s] = String(token).split('.', 2);
  if (!p || !s) throw new Error('bad_token');
  const body = fromB64url(p);
  const sig = fromB64url(s);
  const expected = createHmac('sha256', getSecret()).update(body).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) throw new Error('bad_signature');
  const data = JSON.parse(body.toString('utf8')) as ConsentTokenPayload;
  if (!data.entryId || !data.to || !data.iat || !data.exp) throw new Error('bad_payload');
  const now = Math.floor(Date.now() / 1000);
  if (now > data.exp) throw new Error('expired');
  return data;
}

export function buildConsentUrls(baseUrl: string, token: string) {
  const root = baseUrl.replace(/\/$/, '');
  return {
    pageUrl: `${root}/consent/${encodeURIComponent(token)}`,
    approveUrl: `${root}/consent/approve?token=${encodeURIComponent(token)}`,
    declineUrl: `${root}/consent/decline?token=${encodeURIComponent(token)}`
  };
}


