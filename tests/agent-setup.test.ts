import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Retell SDK
const mockLlmCreate = vi.fn();
const mockAgentCreate = vi.fn();

vi.mock('retell-sdk', () => ({
  default: vi.fn(() => ({
    llm: { create: mockLlmCreate },
    agent: { create: mockAgentCreate },
  })),
}));

// Mock Supabase service client (used to persist agent IDs)
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
vi.mock('../netlify/functions/_shared/token-utils', () => ({
  getServiceSupabase: vi.fn(() => ({
    from: vi.fn(() => ({ update: mockUpdate })),
  })),
}));

// Dynamic import — will fail until plan 02-02 creates this module
const setupRetellAgentImport = () => import('../netlify/functions/setup-retell-agent');

describe('createOrGetRetellAgent (CALL-02 — TCPA preamble enforcement)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RETELL_API_KEY = 'test-retell-key';
    mockLlmCreate.mockResolvedValue({ llm_id: 'llm-new-1' });
    mockAgentCreate.mockResolvedValue({ agent_id: 'agent-new-1' });
  });

  it('when existingAgentId is null, calls client.llm.create with begin_message containing "artificial intelligence" (CALL-02)', async () => {
    const { createOrGetRetellAgent } = await setupRetellAgentImport();
    const fakeSupabase = { from: vi.fn(() => ({ update: mockUpdate })) } as any;
    await createOrGetRetellAgent('clone-1', 'voice-abc', 'user-1', null, null, fakeSupabase);
    expect(mockLlmCreate).toHaveBeenCalledWith(expect.objectContaining({
      begin_message: expect.stringMatching(/artificial intelligence/i),
    }));
  });

  it('when existingAgentId is null, calls client.llm.create with begin_message containing "recorded" (CALL-02)', async () => {
    const { createOrGetRetellAgent } = await setupRetellAgentImport();
    const fakeSupabase = { from: vi.fn(() => ({ update: mockUpdate })) } as any;
    await createOrGetRetellAgent('clone-1', 'voice-abc', 'user-1', null, null, fakeSupabase);
    expect(mockLlmCreate).toHaveBeenCalledWith(expect.objectContaining({
      begin_message: expect.stringMatching(/recorded/i),
    }));
  });

  it('when existingAgentId is non-null, returns immediately without calling client.llm.create', async () => {
    const { createOrGetRetellAgent } = await setupRetellAgentImport();
    const fakeSupabase = { from: vi.fn(() => ({ update: mockUpdate })) } as any;
    const result = await createOrGetRetellAgent('clone-1', 'voice-abc', 'user-1', 'existing-agent', 'existing-llm', fakeSupabase);
    expect(mockLlmCreate).not.toHaveBeenCalled();
    expect(result.agentId).toBe('existing-agent');
  });
});
