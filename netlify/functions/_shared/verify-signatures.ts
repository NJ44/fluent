/**
 * Webhook signature verification helpers.
 * Retell and Twilio verification are used in Phase 2+.
 * Created in Phase 1 to establish the module path.
 */

/**
 * Verify a Retell webhook signature.
 * Header: x-retell-signature (HMAC-SHA256 of raw body with RETELL_WEBHOOK_SECRET)
 * Returns true if signature is valid.
 */
export function verifyRetellSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RETELL_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[verify-signatures] RETELL_WEBHOOK_SECRET not set — signature check skipped');
    return true; // Fail open during development only
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Verify a Twilio webhook signature.
 * Phase 2 will replace this stub with actual twilio.validateRequest() call.
 */
export function verifyTwilioSignature(_rawBody: string, _signature: string): boolean {
  // TODO Phase 2: implement using twilio.validateRequest()
  return true;
}
