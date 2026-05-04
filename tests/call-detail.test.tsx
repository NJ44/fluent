import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Call } from '../src/types/calls';

const mockCall: Call = {
  id: 'call-1',
  user_id: 'user-1',
  retell_call_id: 'retell-abc',
  retell_agent_id: 'agent-xyz',
  to_number: '+12125551234',
  intent: 'Book a table for 4',
  fallback_rules: ['Try 8pm if 7pm is full'],
  consent_attested: true,
  status: 'analyzed',
  transcript: 'AI: Hello, I am calling to book a table.\nRecipient: Sure, what time?',
  outcome_summary: 'Table booked for Friday at 7pm for 4 people.',
  disconnection_reason: 'agent_hangup',
  duration_ms: 45000,
  created_at: '2026-05-04T12:00:00Z',
  started_at: '2026-05-04T12:00:05Z',
  ended_at: '2026-05-04T12:00:50Z',
};

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCall, error: null }),
    })),
  },
}));

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' } })),
}));

const CallDetailImport = () => import('../src/pages/CallDetail');

describe('CallDetail page (POST-01, POST-02)', () => {
  it('displays the outcome summary (POST-01)', async () => {
    const { default: CallDetail } = await CallDetailImport();
    render(
      <MemoryRouter initialEntries={['/calls/call-1']}>
        <Routes>
          <Route path="/calls/:id" element={<CallDetail />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText('Table booked for Friday at 7pm for 4 people.')).toBeInTheDocument();
  });

  it('displays the full transcript (POST-02)', async () => {
    const { default: CallDetail } = await CallDetailImport();
    render(
      <MemoryRouter initialEntries={['/calls/call-1']}>
        <Routes>
          <Route path="/calls/:id" element={<CallDetail />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText(/I am calling to book a table/i)).toBeInTheDocument();
  });
});
