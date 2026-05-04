import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase — simulate no active clone by default
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    })),
  },
}));

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'user-1', email: 'test@test.com', name: 'Test User' },
  })),
}));

// Dynamic import — will fail until plan 02-04 creates this component
const IntentFormImport = () => import('../src/components/IntentForm');

describe('IntentForm (INTENT-01, INTENT-02, INTENT-04)', () => {
  it('renders call goal textarea, phone number input, and fallback rule inputs (INTENT-01, INTENT-02, INTENT-03)', async () => {
    const { default: IntentForm } = await IntentFormImport();
    render(<MemoryRouter><IntentForm onSubmit={vi.fn()} /></MemoryRouter>);
    expect(screen.getByLabelText(/call goal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
  });

  it('submit button is disabled when no active voice clone (INTENT-04)', async () => {
    // mockMaybeSingle returns null (no clone) by default
    const { default: IntentForm } = await IntentFormImport();
    render(<MemoryRouter><IntentForm onSubmit={vi.fn()} /></MemoryRouter>);
    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /send/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  it('shows E.164 validation error for improperly formatted phone number (INTENT-02)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'clone-1' }, error: null });
    const { default: IntentForm } = await IntentFormImport();
    render(<MemoryRouter><IntentForm onSubmit={vi.fn()} /></MemoryRouter>);
    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: '5551234' } });
    fireEvent.blur(phoneInput);
    await waitFor(() => {
      expect(screen.getByText(/international format/i)).toBeInTheDocument();
    });
  });
});
