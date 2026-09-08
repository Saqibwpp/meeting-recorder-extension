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
} catch (error) {
  // Ignore local file errors
}

// Fallback to environment variable (for Vercel)
if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    // Vercel sometimes escapes newlines or adds extra quotes
    let envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (envKey.startsWith('"') && envKey.endsWith('"')) {
      envKey = envKey.slice(1, -1);
    }
    // Replace literal \n with actual newlines just in case
    envKey = envKey.replace(/\\n/g, '\n');
    
    serviceAccount = JSON.parse(envKey);
  } catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON:', error);
  }
}

// Initialize only once
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

// Export instances lazily so the server doesn't crash on import (which breaks CORS preflight)
export const getDb = () => getFirestore();
export const getAdminAuth = () => getAuth();
export const getStorageBucket = () => getStorage().bucket();
