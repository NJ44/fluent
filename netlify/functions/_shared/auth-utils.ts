import type { HandlerEvent } from '@netlify/functions';
import { getServiceSupabase } from './token-utils';

export interface AuthResult {
  userId: string;
}

/**
 * Extracts and verifies the JWT from the Authorization: Bearer <token> header.
 * Returns { userId } on success, null on failure.
 *
 * Usage in every Netlify mutation function:
 *   const auth = await verifyBearerToken(event);
 *   if (!auth) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
 *   const { userId } = auth;
 */
export async function verifyBearerToken(event: HandlerEvent): Promise<AuthResult | null> {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
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
