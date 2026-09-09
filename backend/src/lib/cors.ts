import { NextResponse } from 'next/server';

/**
 * Dynamically resolves CORS headers based on allowed origins (Chrome extension, localhost, production domain).
 */
export function getCorsHeaders(
  request: Request,
  allowedMethods = 'GET, POST, DELETE, OPTIONS'
): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const isAllowed =
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('http://localhost') ||
    origin === 'https://meeting-recorder-extension.vercel.app';

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };
}

/**
 * Common preflight OPTIONS handler.
 */
export function handleOptions(
  request: Request,
  allowedMethods = 'GET, POST, DELETE, OPTIONS'
): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request, allowedMethods),
  });
}
