/**
 * Script to set CORS configuration on Firebase Storage bucket
 * using the Firebase Admin SDK (avoids needing gsutil)
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');

const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'embrace-ai-notetaker.firebasestorage.app'
});

const corsConfig = [
  {
    origin: ['chrome-extension://*', 'http://localhost:*', 'https://meeting-recorder-extension.vercel.app'],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'x-goog-resumable'],
    maxAgeSeconds: 3600
  }
];

async function setCors() {
  const bucket = getStorage().bucket();
  await bucket.setCorsConfiguration(corsConfig);
  console.log('✅ CORS configuration applied successfully to:', bucket.name);
  
  // Verify it was set
  const [metadata] = await bucket.getMetadata();
  console.log('Current CORS:', JSON.stringify(metadata.cors, null, 2));
}

setCors().catch(err => {
  console.error('❌ Error setting CORS:', err.message);
  process.exit(1);
});
