import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    }
  }))
}));

describe('auth: signup (AUTH-01)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls supabase.auth.signUp with email and password', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com', created_at: '', user_metadata: { name: 'Test' } } },
      error: null
    });
    const { signup } = await import('../src/lib/auth');
    const user = await signup({ name: 'Test', email: 'test@test.com', password: 'pass123' });
    expect(mockSignUp).toHaveBeenCalledOnce();
    expect(user.email).toBe('test@test.com');
  });
});

describe('auth: login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls signInWithPassword and returns user', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com', created_at: '', user_metadata: { name: 'Test' } } },
      error: null
    });
    const { login } = await import('../src/lib/auth');
    const user = await login({ email: 'test@test.com', password: 'pass123' });
    expect(user.email).toBe('test@test.com');
  });
});

describe('auth: logout (AUTH-03)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls supabase.auth.signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const { logout } = await import('../src/lib/auth');
    await logout();
    expect(mockSignOut).toHaveBeenCalledOnce();
  });
});
