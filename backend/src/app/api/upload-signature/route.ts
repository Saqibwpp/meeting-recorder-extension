import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { generateUploadSignature } from '@/lib/cloudinary';

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const isAllowed =
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('http://localhost') ||
    origin === 'https://meeting-recorder-extension.vercel.app';

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

async function verifyAuth(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    throw new Error('Unauthorized', { cause: error });
  }
}

export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId') || undefined;

    const signatureData = generateUploadSignature('meeting-recordings', meetingId);

    return NextResponse.json(signatureData, {
      headers: corsHeaders,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message },
      { status: err.message === 'Unauthorized' ? 401 : 500, headers: corsHeaders }
    );
  }
}
