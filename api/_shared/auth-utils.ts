import type { VercelRequest } from '@vercel/node';
import { getServiceSupabase } from './token-utils';

export interface AuthResult {
  userId: string;
}

export async function verifyBearerToken(req: VercelRequest): Promise<AuthResult | null> {
  const authHeader = (req.headers?.authorization || req.headers?.Authorization || '') as string;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const supabase = getServiceSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { userId: user.id };
  } catch {
    return null;
  }
}
