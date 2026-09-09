import crypto from 'crypto';
import { getDb, getAdminAuth } from './firebase-admin';
import { ApiKeyRecord, McpAuthContext } from '@/types/mcp';

const API_KEYS_COLLECTION = 'apiKeys';

/**
 * Generate a new persistent API Key for an authenticated user.
 */
export async function generateUserApiKey(userId: string, name = 'Default AI Key'): Promise<ApiKeyRecord> {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const apiKey = `embrace_live_${randomBytes}`;
  const now = new Date().toISOString();

  const record: ApiKeyRecord = {
    apiKey,
    userId,
    name,
    createdAt: now,
    revoked: false,
  };

  await getDb().collection(API_KEYS_COLLECTION).doc(apiKey).set(record);
  return record;
}

/**
 * Retrieve all API keys associated with a given user.
 */
export async function getUserApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const snapshot = await getDb()
    .collection(API_KEYS_COLLECTION)
    .where('userId', '==', userId)
    .where('revoked', '==', false)
    .get();

  return snapshot.docs.map((doc) => doc.data() as ApiKeyRecord);
}

/**
 * Revoke an existing API key.
 */
export async function revokeUserApiKey(userId: string, apiKey: string): Promise<boolean> {
  const docRef = getDb().collection(API_KEYS_COLLECTION).doc(apiKey);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return false;
  }

  const data = docSnap.data() as ApiKeyRecord;
  if (data.userId !== userId) {
    throw new Error('Unauthorized to revoke this API key');
  }

  await docRef.update({ revoked: true, revokedAt: new Date().toISOString() });
  return true;
}

/**
 * Verify authorization from an incoming MCP request header.
 * Supports:
 *  1. Persistent API Keys (e.g. `embrace_live_...` or x-api-key)
 *  2. Firebase Bearer ID Tokens
 */
export async function verifyMcpAuth(authHeader: string | null): Promise<McpAuthContext> {
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  let token = authHeader.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  if (!token) {
    throw new Error('Empty authentication token');
  }

  // 1. Check if token is an Embrace API Key
  if (token.startsWith('embrace_live_') || token.startsWith('embrace_')) {
    const keyDoc = await getDb().collection(API_KEYS_COLLECTION).doc(token).get();

    if (keyDoc.exists) {
      const data = keyDoc.data() as ApiKeyRecord;
      if (!data.revoked && data.userId) {
        return {
          userId: data.userId,
          authMethod: 'api_key',
        };
      }
    }
    throw new Error('Invalid or revoked API key');
  }

  // 2. Fallback: Verify as Firebase ID Token
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return {
      userId: decodedToken.uid,
      authMethod: 'firebase_token',
    };
  } catch {
    // Also check Firestore in case a non-prefixed key was saved
    const fallbackKeyDoc = await getDb().collection(API_KEYS_COLLECTION).doc(token).get();
    if (fallbackKeyDoc.exists) {
      const data = fallbackKeyDoc.data() as ApiKeyRecord;
      if (!data.revoked && data.userId) {
        return {
          userId: data.userId,
          authMethod: 'api_key',
        };
      }
    }
    throw new Error('Unauthorized: Invalid credentials');
  }
}
