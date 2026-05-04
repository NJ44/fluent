// src/types/calls.ts
// Shared types for the outbound call engine (Phase 2)

export type CallStatus =
  | 'draft'
  | 'initiating'
  | 'ringing'
  | 'active'
  | 'ended'
  | 'analyzed'
  | 'failed';

export interface Call {
  id: string;
  user_id: string;
  retell_call_id: string | null;
  retell_agent_id: string | null;
  to_number: string;
  intent: string;
  fallback_rules: string[];
  consent_attested: boolean;
  status: CallStatus;
  transcript: string | null;
  outcome_summary: string | null;
  disconnection_reason: string | null;
  duration_ms: number | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

// Intent form shape (submitted by user, consumed by initiate-call function)
export interface CallIntent {
  toNumber: string;       // E.164 format (+12125551234)
  intent: string;         // Plain English call goal (min 10 chars)
  fallbackRules: string[]; // 0-3 fallback rules
  consentAttested: boolean; // User attests they have permission to call this number
}

// Disconnection reasons that indicate a call failure (vs. successful completion)
// Source: docs.retellai.com/reliability/debug-call-disconnect
export const FAILURE_DISCONNECTION_REASONS = new Set<string>([
  'dial_busy',
  'dial_failed',
  'dial_no_answer',
  'invalid_destination',
  'telephony_provider_permission_denied',
  'telephony_provider_unavailable',
  'user_declined',
  'marked_as_spam',
  'concurrency_limit_reached',
  'error_retell',
  'error_unknown',
]);

export function isFailureDisconnection(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return FAILURE_DISCONNECTION_REASONS.has(reason);
}

// Human-readable failure messages for CALL-07
export const DISCONNECTION_MESSAGES: Record<string, string> = {
  dial_busy: 'The recipient was busy. Please try again later.',
  dial_failed: 'The call could not connect. Please check the number and try again.',
  dial_no_answer: 'No answer. The recipient did not pick up.',
  invalid_destination: 'Invalid phone number. Please use international format: +1 (country code) + number.',
  telephony_provider_permission_denied: 'Call blocked by carrier. Please contact support.',
  telephony_provider_unavailable: 'Telephone service temporarily unavailable. Please try again.',
  user_declined: 'The recipient declined the call.',
  marked_as_spam: 'Call flagged as spam by carrier.',
  concurrency_limit_reached: 'Too many calls in progress. Please wait and try again.',
  error_retell: 'An error occurred with the AI call service. Please try again.',
  error_unknown: 'An unexpected error occurred. Please try again.',
};

export function getDisconnectionMessage(reason: string | null | undefined): string {
  if (!reason) return 'Call ended.';
  return DISCONNECTION_MESSAGES[reason] ?? `Call ended (${reason}).`;
}
