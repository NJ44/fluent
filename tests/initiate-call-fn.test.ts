import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Retell SDK
const mockCreatePhoneCall = vi.fn();
const mockLlmCreate = vi.fn();
const mockAgentCreate = vi.fn();

vi.mock('retell-sdk', () => ({
  default: vi.fn(() => ({
    call: { createPhoneCall: mockCreatePhoneCall },
    llm: { create: mockLlmCreate },
    agent: { create: mockAgentCreate },
  })),
}));

// Mock Supabase — service client
const mockUpdate = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

vi.mock('../netlify/functions/_shared/token-utils', () => ({
  getServiceSupabase: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
    })),
  })),
}));

vi.mock('../netlify/functions/_shared/auth-utils', () => ({
  verifyBearerToken: vi.fn().mockResolvedValue({ userId: 'user-1' }),
}));

vi.mock('../netlify/functions/_shared/cors', () => ({
  getCorsHeaders: vi.fn(() => ({})),
}));

// Dynamic import — will fail until plan 02-02 creates this function
const initiateCallImport = () => import('../netlify/functions/initiate-call');

describe('initiate-call Netlify function (INTENT-04, CALL-01, CALL-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePhoneCall.mockResolvedValue({ call_id: 'retell-call-123', call_status: 'registered' });
    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'call-db-1' }, error: null }) }) });
  });

  it('returns 403 when no active voice clone exists (INTENT-04)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { handler } = await initiateCallImport();
    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token123' },
      body: JSON.stringify({ toNumber: '+12125551234', intent: 'Book a table for 2', fallbackRules: [], consentAttested: true }),
    };
    const result = await handler(event as any, {} as any);
    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error).toMatch(/voice clone/i);
  });

  it('calls createPhoneCall with correct from_number, to_number, and override_agent_id (CALL-01)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'clone-1', retell_voice_id: 'voice-abc', retell_agent_id: 'agent-xyz', retell_llm_id: 'llm-xyz' },
      error: null,
    });
    process.env.RETELL_FROM_NUMBER = '+15005550006';
    const { handler } = await initiateCallImport();
    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token123' },
      body: JSON.stringify({ toNumber: '+12125551234', intent: 'Book a table for 2', fallbackRules: [], consentAttested: true }),
    };
    await handler(event as any, {} as any);
    expect(mockCreatePhoneCall).toHaveBeenCalledWith(expect.objectContaining({
      from_number: '+15005550006',
      to_number: '+12125551234',
      override_agent_id: 'agent-xyz',
    }));
  });

  it('injects intent and fallback_rules as retell_llm_dynamic_variables (CALL-02)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'clone-1', retell_voice_id: 'voice-abc', retell_agent_id: 'agent-xyz', retell_llm_id: 'llm-xyz' },
      error: null,
    });
    const { handler } = await initiateCallImport();
    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token123' },
      body: JSON.stringify({
        toNumber: '+12125551234',
        intent: 'Book a table for 4 at 7pm',
        fallbackRules: ['If 7pm is full, try 8pm'],
        consentAttested: true,
      }),
    };
    await handler(event as any, {} as any);
    expect(mockCreatePhoneCall).toHaveBeenCalledWith(expect.objectContaining({
      retell_llm_dynamic_variables: expect.objectContaining({
        intent: 'Book a table for 4 at 7pm',
        fallback_rules: expect.stringContaining('If 7pm is full'),
      }),
    }));
  });

  it('returns 400 for missing consentAttested field', async () => {
    const { handler } = await initiateCallImport();
    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token123' },
      body: JSON.stringify({ toNumber: '+12125551234', intent: 'Book a table', fallbackRules: [] }),
    };
    const result = await handler(event as any, {} as any);
    expect(result.statusCode).toBe(400);
  });

  it('retell agent LLM begin_message contains TCPA preamble text (CALL-02)', async () => {
    // When retell_agent_id is null, createOrGetRetellAgent creates a new LLM.
    // The begin_message on that LLM must contain TCPA disclosure phrases.
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'clone-1', retell_voice_id: 'voice-abc', retell_agent_id: null, retell_llm_id: null },
      error: null,
    });
    mockLlmCreate.mockResolvedValue({ llm_id: 'new-llm-1' });
    mockAgentCreate.mockResolvedValue({ agent_id: 'new-agent-1' });
    const { handler } = await initiateCallImport();
    const event = {
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token123' },
      body: JSON.stringify({ toNumber: '+12125551234', intent: 'Book a table for 2', fallbackRules: [], consentAttested: true }),
    };
    await handler(event as any, {} as any);
    expect(mockLlmCreate).toHaveBeenCalledWith(expect.objectContaining({
      begin_message: expect.stringMatching(/artificial intelligence/i),
    }));
    expect(mockLlmCreate).toHaveBeenCalledWith(expect.objectContaining({
      begin_message: expect.stringMatching(/may be recorded/i),
    }));
  });
});
