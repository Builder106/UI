import { describe, it, expect } from 'vitest';
import { buildAuthorizeUrl, validateState } from '../src/lib/oauth';

describe('oauth helpers', () => {
  it('builds authorize URL with params', () => {
    const url = buildAuthorizeUrl({
      clientId: 'abc',
      redirectUri: 'https://example.com/cb',
      scope: 'public',
      state: 'xyz'
    });
    expect(url).toContain('client_id=abc');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcb');
    expect(url).toContain('scope=public');
    expect(url).toContain('state=xyz');
  });

  it('validates matching state', () => {
    expect(validateState('abc', 'abc')).toBe(true);
    expect(validateState('abc', 'def')).toBe(false);
    expect(validateState(null, 'abc')).toBe(false);
  });
});


