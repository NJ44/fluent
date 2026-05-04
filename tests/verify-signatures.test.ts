import { describe, it, expect, beforeAll } from 'vitest';
import { verifyRetellSignature } from '../netlify/functions/_shared/verify-signatures';

// We need to generate a real HMAC to test the valid-signature path.
// Using Node crypto directly in the test.
const crypto = require('crypto');

function makeSignature(rawBody: string, apiKey: string, timestampMs: number): string {
  const timestampStr = String(timestampMs);
  const digest = crypto
    .createHmac('sha256', apiKey)
    .update(rawBody + timestampStr)
    .digest('hex');
  return `v=${timestampStr},d=${digest}`;
}

const FAKE_API_KEY = 'test-api-key-12345';
const REAL_BODY = '{"event":"call_started","call":{}}';

// Set RETELL_API_KEY in the process env for these tests
beforeAll(() => {
  process.env.RETELL_API_KEY = FAKE_API_KEY;
});

describe('verifyRetellSignature (CALL-03)', () => {
  it('returns true for a correctly-signed request', () => {
    const sig = makeSignature(REAL_BODY, FAKE_API_KEY, Date.now());
    expect(verifyRetellSignature(REAL_BODY, sig)).toBe(true);
  });

  it('returns false for a tampered body', () => {
    const sig = makeSignature(REAL_BODY, FAKE_API_KEY, Date.now());
    expect(verifyRetellSignature('{"tampered":true}', sig)).toBe(false);
  });

  it('returns false for wrong API key', () => {
    const sig = makeSignature(REAL_BODY, 'wrong-key', Date.now());
    expect(verifyRetellSignature(REAL_BODY, sig)).toBe(false);
  });

  it('returns false for malformed header (not v=...,d=... format)', () => {
    expect(verifyRetellSignature(REAL_BODY, 'sha256=abc123')).toBe(false);
    expect(verifyRetellSignature(REAL_BODY, '')).toBe(false);
  });

  it('returns false for replayed timestamp (>5 minutes old)', () => {
    const oldTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const sig = makeSignature(REAL_BODY, FAKE_API_KEY, oldTimestamp);
    expect(verifyRetellSignature(REAL_BODY, sig)).toBe(false);
  });
});
