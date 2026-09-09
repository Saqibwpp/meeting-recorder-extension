import { NextResponse } from 'next/server';
import { generateUserApiKey, getUserApiKeys, revokeUserApiKey } from '@/lib/mcp-auth';
import { getCorsHeaders, handleOptions } from '@/lib/cors';
import { verifyAuth } from '@/lib/auth';

export async function OPTIONS(request: Request) {
  return handleOptions(request);
}

// GET: Retrieve all active API keys for current user
export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const uid = await verifyAuth(request);
    const keys = await getUserApiKeys(uid);
    return NextResponse.json({ keys }, { headers: corsHeaders });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
  }
}

// POST: Generate a new API key
export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const uid = await verifyAuth(request);
    let name = 'AI Assistant Key';
    try {
      const body = await request.json();
      if (body.name) name = body.name;
    } catch {
      // Body is optional
    }

    const newKey = await generateUserApiKey(uid, name);
    return NextResponse.json({ key: newKey }, { status: 201, headers: corsHeaders });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
  }
}

// DELETE: Revoke an existing API key
export async function DELETE(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const uid = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing apiKey parameter' }, { status: 400, headers: corsHeaders });
    }

    const revoked = await revokeUserApiKey(uid, apiKey);
    return NextResponse.json({ success: revoked }, { headers: corsHeaders });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 400, headers: corsHeaders });
  }
}
