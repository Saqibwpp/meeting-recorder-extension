import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  // Allow the specific extension origin, localhost, and vercel
  const isAllowed =
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('http://localhost') ||
    origin === 'https://meeting-recorder-extension.vercel.app';

  // Handle OPTIONS preflight request natively
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isAllowed ? origin : '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Pass along normal requests with the origin header attached
  const response = NextResponse.next();
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
