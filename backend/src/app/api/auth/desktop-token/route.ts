import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { getCorsHeaders, handleOptions } from '@/lib/cors'

export async function OPTIONS(request: Request) {
  return handleOptions(request)
}

export async function POST(request: Request) {
  const headers = getCorsHeaders(request)

  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401, headers }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    const adminAuth = getAdminAuth()
    const decodedToken = await adminAuth.verifyIdToken(idToken)

    // Mint a custom token for the desktop client to sign into Firebase SDK
    const customToken = await adminAuth.createCustomToken(decodedToken.uid)

    return NextResponse.json({ customToken }, { status: 200, headers })
  } catch (error) {
    console.error('Error minting desktop custom token:', error)
    return NextResponse.json(
      { error: 'Failed to authenticate desktop session' },
      { status: 500, headers }
    )
  }
}
