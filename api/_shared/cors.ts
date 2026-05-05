import type { VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(o => o.trim());

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  if (ALLOWED_ORIGINS.includes('*')) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };
  }
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

export function applyCors(res: VercelResponse, origin?: string | null): VercelResponse {
  const headers = getCorsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  return res;
}
