import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthContext: { Provider: ({ children }: any) => children },
}));

describe('ProtectedRoute (AUTH-04)', () => {
  it('redirects to /sign-in when not authenticated', async () => {
    const { useAuth } = await import('../src/contexts/AuthContext');
    (useAuth as any).mockReturnValue({ isAuthenticated: false, isLoading: false, user: null });
    const { default: ProtectedRoute } = await import('../src/components/ProtectedRoute');
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', async () => {
    const { useAuth } = await import('../src/contexts/AuthContext');
    (useAuth as any).mockReturnValue({ isAuthenticated: true, isLoading: false, user: { id: '1', email: 'a@b.com', name: 'A' } });
    const { default: ProtectedRoute } = await import('../src/components/ProtectedRoute');
    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
