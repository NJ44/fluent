import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthContext: { Provider: ({ children }: any) => children },
}));

// Mock supabase — we control the resolved value via cloneData
let cloneData: { id: string } | null = { id: 'clone-1' };

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: (_table: string) => ({
      select: (_col: string) => ({
        eq: (_col1: string, _val1: string) => ({
          eq: (_col2: string, _val2: string) => ({
            maybeSingle: () => Promise.resolve({ data: cloneData, error: null }),
          }),
        }),
      }),
    }),
  },
}));

describe('ProtectedRoute (AUTH-04)', () => {
  beforeEach(() => {
    // Reset to default: user has an active clone
    cloneData = { id: 'clone-1' };
  });

  it('redirects to /sign-in when not authenticated', async () => {
    const { useAuth } = await import('../src/contexts/AuthContext');
    (useAuth as any).mockReturnValue({ isAuthenticated: false, isLoading: false, user: null });
    const { default: ProtectedRoute } = await import('../src/components/ProtectedRoute');
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={
            <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
          } />
          <Route path="/sign-in" element={<div>Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated and has active clone', async () => {
    const { useAuth } = await import('../src/contexts/AuthContext');
    (useAuth as any).mockReturnValue({ isAuthenticated: true, isLoading: false, user: { id: '1', email: 'a@b.com', name: 'A' } });
    const { default: ProtectedRoute } = await import('../src/components/ProtectedRoute');
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={
            <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    // Wait for clone check to resolve (has_clone) then children render
    expect(await screen.findByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects authenticated user with no active clone to /onboarding', async () => {
    // Override: user has NO active clone
    cloneData = null;

    const { useAuth } = await import('../src/contexts/AuthContext');
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'u1', email: 'a@b.com', name: 'A' },
    });

    const { default: ProtectedRoute } = await import('../src/components/ProtectedRoute');
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={
            <ProtectedRoute><div>Dashboard Content</div></ProtectedRoute>
          } />
          <Route path="/onboarding" element={<div>Onboarding</div>} />
        </Routes>
      </MemoryRouter>
    );
    // After clone check resolves (no clone): should redirect to /onboarding
    expect(await screen.findByText('Onboarding')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });
});
