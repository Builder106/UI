import { describe, it, expect, beforeAll } from 'vitest';
import { signConsentToken, verifyConsentToken, buildConsentUrls } from '../src/lib/consentToken';

describe('consent token util', () => {
  beforeAll(() => {
    process.env.CONSENT_SECRET = 'test-secret';
  });

  it('signs and verifies tokens', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signConsentToken({
      entryId: '001',
      to: 'creator@example.com',
      scope: 'all_shots',
      iat: now,
      exp: now + 3600
    });
    const data = verifyConsentToken(token);
    expect(data.entryId).toBe('001');
    expect(data.to).toBe('creator@example.com');
    expect(data.scope).toBe('all_shots');
  });

  it('rejects tampered tokens', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signConsentToken({ entryId: 'x', to: 'a@b.c', iat: now, exp: now + 3600 });
    const parts = token.split('.');
    const bad = parts[0] + '.AAAA';
    expect(() => verifyConsentToken(bad)).toThrow();
  });

  it('builds consent URLs', () => {
    const urls = buildConsentUrls('https://weaveui.local', 'abc');
    expect(urls.pageUrl).toContain('/consent/');
    expect(urls.approveUrl).toContain('/consent/approve');
    expect(urls.declineUrl).toContain('/consent/decline');
  });
});


