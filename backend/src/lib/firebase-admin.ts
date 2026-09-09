import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';

let serviceAccount: Record<string, unknown> | undefined;

// Try local file first (for development)
try {
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const fileContents = fs.readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(fileContents);
  }
} catch {
  // Ignore local file errors
}

// Fallback to environment variable (for Vercel)
if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    let envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    // Check if the key is base64 encoded (a robust way to bypass Vercel string escaping issues)
    if (!envKey.trim().startsWith('{')) {
      try {
        envKey = Buffer.from(envKey, 'base64').toString('utf8');
      } catch {
        // Fallback to raw if not base64
      }
    } else {
      if (envKey.startsWith('"') && envKey.endsWith('"')) {
        envKey = envKey.slice(1, -1);
      }
      envKey = envKey.replace(/\\n/g, '\n');
    }

    serviceAccount = JSON.parse(envKey);
  } catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON:', error);
  }
}

// Initialize only once lazily
function initApp() {
  if (!getApps().length) {
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: 'embrace-ai-notetaker.firebasestorage.app',
      });
      console.log('✅ Firebase Admin initialized successfully.');
    } else {
      console.error('❌ CRITICAL: No Firebase Service Account found. API will fail.');
    }
  }
}

// Export instances lazily so the server doesn't crash on import (which breaks CORS preflight)
export const getDb = () => {
  initApp();
  return getFirestore();
};
export const getAdminAuth = () => {
  initApp();
  return getAuth();
};
export const getStorageBucket = () => {
  initApp();
  return getStorage().bucket();
};
