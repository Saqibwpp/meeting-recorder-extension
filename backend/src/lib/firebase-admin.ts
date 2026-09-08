import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';

let serviceAccount: Record<string, unknown> | undefined;
try {
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  const fileContents = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(fileContents);
} catch (error) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else {
    console.error('Failed to load Firebase Service Account JSON.', error);
  }
}

if (!getApps().length && serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: 'embrace-ai-notetaker.firebasestorage.app',
  });
}

export const db = getFirestore();
export const auth = getAuth();
export const storageBucket = getStorage().bucket();
