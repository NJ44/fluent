export function verifyRetellSignature(rawBody: string, signatureHeader: string): boolean {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.warn('[verify-signatures] RETELL_API_KEY not set — skipping signature check (dev fallback)');
    return true;
  }
  try {
    const match = signatureHeader.match(/^v=(\d+),d=(.+)$/);
    if (!match) return false;
    const [, timestampStr, digest] = match;
    const timestamp = parseInt(timestampStr, 10);

    if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');

    const expected = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody + timestampStr)
      .digest('hex');

    if (expected.length !== digest.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
  } catch {
    return false;
  }
}

export function verifyTwilioSignature(_rawBody: string, _signature: string): boolean {
  // TODO Phase 4: implement using twilio.validateRequest()
  return true;
}
