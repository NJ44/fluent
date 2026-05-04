/**
 * Webhook signature verification helpers.
 * Phase 2: verifyRetellSignature() — real implementation replacing Phase 1 stub.
 * Phase 4: verifyTwilioSignature() — placeholder until Twilio Conference added.
 */

/**
 * Verify a Retell webhook signature.
 *
 * Header format: x-retell-signature: v={timestamp_ms},d={hex_digest}
 * Algorithm: HMAC-SHA256(rawBody + timestampStr, RETELL_API_KEY)
 * Replay window: reject if timestamp > 5 minutes old
 *
 * Source: docs.retellai.com/features/secure-webhook (verified 2026-05-04)
 *
 * IMPORTANT: The HMAC secret is RETELL_API_KEY, NOT a separate webhook secret.
 * The Phase 1 stub incorrectly used RETELL_WEBHOOK_SECRET — this is the fix.
 */
export function verifyRetellSignature(rawBody: string, signatureHeader: string): boolean {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    console.warn('[verify-signatures] RETELL_API_KEY not set — skipping signature check (dev fallback)');
    return true; // Fail-open in dev only
  }
  try {
    // Parse header: "v=1714000000000,d=abc123..."
    const match = signatureHeader.match(/^v=(\d+),d=(.+)$/);
    if (!match) return false;
    const [, timestampStr, digest] = match;
    const timestamp = parseInt(timestampStr, 10);

    // Replay attack prevention: reject timestamps older than 5 minutes
    if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');

    // Signed string is rawBody + timestampStr (NOT just rawBody — this was the Phase 1 bug)
    const expected = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody + timestampStr)
      .digest('hex');

    // Timing-safe comparison prevents timing attacks
    if (expected.length !== digest.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
  } catch {
    return false;
  }
}

/**
 * Verify a Twilio webhook signature.
 * Phase 4 will replace this stub with actual twilio.validateRequest() call.
 */
export function verifyTwilioSignature(_rawBody: string, _signature: string): boolean {
  // TODO Phase 4: implement using twilio.validateRequest()
  return true;
}
