import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Call } from '../src/types/calls';

const mockCalls: Call[] = [
  {
    id: 'call-1', user_id: 'u1', retell_call_id: null, retell_agent_id: null,
    to_number: '+12125551234', intent: 'Book a table for 4', fallback_rules: [],
    consent_attested: true, status: 'analyzed',
    transcript: null, outcome_summary: 'Table booked for Friday.',
    disconnection_reason: null, duration_ms: 45000,
    created_at: '2026-05-04T12:00:00Z', started_at: null, ended_at: null,
  },
  {
    id: 'call-2', user_id: 'u1', retell_call_id: null, retell_agent_id: null,
    to_number: '+14155552671', intent: 'Cancel dentist appointment', fallback_rules: [],
    consent_attested: true, status: 'failed',
    transcript: null, outcome_summary: null,
    disconnection_reason: 'dial_no_answer', duration_ms: null,
    created_at: '2026-05-03T10:00:00Z', started_at: null, ended_at: null,
  },
];

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockCalls, error: null }),
    })),
  },
}));

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' } })),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const CallHistoryImport = () => import('../src/pages/CallHistory');

describe('CallHistory page (HIST-01, HIST-02)', () => {
  it('renders a list row for each call with intent and status (HIST-01)', async () => {
    const { default: CallHistory } = await CallHistoryImport();
    render(<MemoryRouter><CallHistory /></MemoryRouter>);
    expect(await screen.findByText(/Book a table for 4/i)).toBeInTheDocument();
    expect(await screen.findByText(/Cancel dentist appointment/i)).toBeInTheDocument();
  });

  it('shows outcome summary when available (HIST-01)', async () => {
    const { default: CallHistory } = await CallHistoryImport();
    render(<MemoryRouter><CallHistory /></MemoryRouter>);
    expect(await screen.findByText(/Table booked for Friday/i)).toBeInTheDocument();
  });

  it('shows failure reason when call failed (HIST-01, CALL-07)', async () => {
    const { default: CallHistory } = await CallHistoryImport();
    render(<MemoryRouter><CallHistory /></MemoryRouter>);
    expect(await screen.findByText(/no answer/i)).toBeInTheDocument();
  });

  it('clicking a row navigates to /calls/:id (HIST-02)', async () => {
    const { default: CallHistory } = await CallHistoryImport();
    render(<MemoryRouter><CallHistory /></MemoryRouter>);
    const row = await screen.findByText(/Book a table for 4/i);
    fireEvent.click(row.closest('[data-call-id]') || row);
    expect(mockNavigate).toHaveBeenCalledWith('/calls/call-1');
  });
});
