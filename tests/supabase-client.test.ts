import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key, options) => ({ _url: url, _options: options }))
}));

describe('supabase client config', () => {
  it('is configured with persistSession: true', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    // Import the module under test
    await import('../src/lib/supabase');
    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: true }) })
    );
  });

  it('is configured with autoRefreshToken: true', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    await import('../src/lib/supabase');
    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ auth: expect.objectContaining({ autoRefreshToken: true }) })
    );
  });
});
