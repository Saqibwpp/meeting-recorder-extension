import { NextResponse } from 'next/server';
import { db, auth, storageBucket } from '@/lib/firebase-admin';

// Helper to verify the user's token from the Authorization header
async function verifyAuth(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    throw new Error('Unauthorized', { cause: error });
  }
}

export async function GET(request: Request) {
  try {
    const uid = await verifyAuth(request);

    // Fetch meetings for this user
    const meetingsSnapshot = await db
      .collection('meetings')
      .where('userId', '==', uid)
      .orderBy('startTime', 'desc')
      .get();

    const meetings = meetingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ meetings });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await verifyAuth(request);
    const body = await request.json();

    const { audioBase64, mimeType, id: meetingId, ...rest } = body;

    let audioUrl = '';

    // Upload audio to Firebase Storage server-side (no CORS issues!)
    if (audioBase64 && meetingId) {
      try {
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        const filePath = `users/${uid}/meetings/${meetingId}.webm`;
        const file = storageBucket.file(filePath);

        await file.save(audioBuffer, {
          metadata: {
            contentType: mimeType || 'audio/webm',
          },
        });

        // Make publicly readable and get URL
        await file.makePublic();
        audioUrl = file.publicUrl();
        console.log('✅ Audio uploaded to Firebase Storage:', audioUrl);
      } catch (storageErr) {
        console.error('⚠️ Audio upload to Storage failed (saving transcript only):', storageErr);
      }
    }

    // Save to Firestore (without the raw base64 - just the URL)
    const meetingData = {
      ...rest,
      id: meetingId,
      userId: uid,
      audioUrl,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('meetings').add(meetingData);

    return NextResponse.json({ id: docRef.id, ...meetingData }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: err.message === 'Unauthorized' ? 401 : 400 });
  }
}
