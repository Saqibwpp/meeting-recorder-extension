import { getAdminAuth } from './firebase-admin';

/**
 * Verify Firebase ID Token from the request Authorization header.
 * Returns the authenticated user's uid.
 */
export async function verifyAuth(request: Request): Promise<string> {
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
