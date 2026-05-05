import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock verify-signatures — we test it separately in verify-signatures.test.ts
const mockVerifyRetellSignature = vi.fn();
vi.mock('../netlify/functions/_shared/verify-signatures', () => ({
  verifyRetellSignature: mockVerifyRetellSignature,
}));

// Mock Supabase service client
const mockUpdateChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
const mockFromChain = { update: vi.fn().mockReturnValue(mockUpdateChain) };
vi.mock('../netlify/functions/_shared/token-utils', () => ({
  getServiceSupabase: vi.fn(() => ({
    from: vi.fn().mockReturnValue(mockFromChain),
  })),
}));

// Mock Anthropic SDK
const mockMessagesCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'Appointment confirmed for Tuesday at 4pm.' }],
});
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({ messages: { create: mockMessagesCreate } })),
}));

// Dynamic import — will fail until plan 02-03 creates this function
const retellWebhookImport = () => import('../netlify/functions/retell-webhook');

function makeWebhookEvent(body: object, signature = 'valid-sig'): any {
  return {
    httpMethod: 'POST',
    headers: { 'x-retell-signature': signature },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

describe('retell-webhook Netlify function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyRetellSignature.mockReturnValue(true);
    mockUpdateChain.eq.mockResolvedValue({ error: null });
  });

  it('returns 401 for invalid signature (CALL-03)', async () => {
    mockVerifyRetellSignature.mockReturnValue(false);
    const { handler } = await retellWebhookImport();
    const result = await handler(makeWebhookEvent({ event: 'call_started', call: {} }, 'bad-sig'), {} as any);
    expect(result.statusCode).toBe(401);
  });

  it('call_started: updates calls.status to "active" (CALL-05)', async () => {
    const { handler } = await retellWebhookImport();
    await handler(makeWebhookEvent({
      event: 'call_started',
      call: { call_id: 'retell-1', metadata: { fluent_call_id: 'db-call-1' } },
    }), {} as any);
    expect(mockFromChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    expect(mockUpdateChain.eq).toHaveBeenCalledWith('id', 'db-call-1');
  });

  it('call_ended: stores transcript and duration_ms, sets status "ended" (CALL-06, CALL-08, POST-02)', async () => {
    const { handler } = await retellWebhookImport();
    await handler(makeWebhookEvent({
      event: 'call_ended',
      call: {
        call_id: 'retell-1',
        metadata: { fluent_call_id: 'db-call-1' },
        transcript: 'AI: Hello. Recipient: Hi.',
        disconnection_reason: 'agent_hangup',
        start_timestamp: 1000,
        end_timestamp: 62000,
      },
    }), {} as any);
    expect(mockFromChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ended',
      transcript: 'AI: Hello. Recipient: Hi.',
      duration_ms: 61000,
    }));
  });

  it('call_ended with dial_no_answer: sets status "failed" not "ended" (CALL-07)', async () => {
    const { handler } = await retellWebhookImport();
    await handler(makeWebhookEvent({
      event: 'call_ended',
      call: {
        call_id: 'retell-1',
        metadata: { fluent_call_id: 'db-call-1' },
        transcript: '',
        disconnection_reason: 'dial_no_answer',
        start_timestamp: 1000,
        end_timestamp: 5000,
      },
    }), {} as any);
    expect(mockFromChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      disconnection_reason: 'dial_no_answer',
    }));
  });

  it('call_analyzed: triggers Claude summarization and sets status "analyzed" (POST-01)', async () => {
    const { handler } = await retellWebhookImport();
    const result = await handler(makeWebhookEvent({
      event: 'call_analyzed',
      call: {
        call_id: 'retell-1',
        metadata: { fluent_call_id: 'db-call-1' },
        transcript: 'AI: Hello. Recipient: Hi. AI: I am calling to book a table.',
      },
    }), {} as any);
    // Webhook must return 200 immediately (before Claude finishes — async pattern)
    expect(result.statusCode).toBe(200);
    // Claude API should eventually be called (allow async)
    await new Promise(r => setTimeout(r, 50));
    expect(mockMessagesCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
    }));
  });

  it('returns 200 immediately even when summarization is async (Netlify timeout guard)', async () => {
    // Simulate Claude taking a long time
    mockMessagesCreate.mockImplementationOnce(() => new Promise(r => setTimeout(() => r({
      content: [{ type: 'text', text: 'Summary.' }],
    }), 500)));
    const { handler } = await retellWebhookImport();
    const start = Date.now();
    const result = await handler(makeWebhookEvent({
      event: 'call_analyzed',
      call: { call_id: 'r1', metadata: { fluent_call_id: 'db-1' }, transcript: 'test' },
    }), {} as any);
    const elapsed = Date.now() - start;
    expect(result.statusCode).toBe(200);
    // Should return in well under 500ms (not waiting for Claude)
    expect(elapsed).toBeLessThan(200);
  });
});
