import { NextResponse } from 'next/server';
import { generateUploadSignature } from '@/lib/cloudinary';
import { getCorsHeaders, handleOptions } from '@/lib/cors';
import { verifyAuth } from '@/lib/auth';

export async function OPTIONS(request: Request) {
  return handleOptions(request, 'GET, OPTIONS');
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
