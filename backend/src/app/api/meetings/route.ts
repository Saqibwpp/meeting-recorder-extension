import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

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
    throw new Error('Unauthorized');
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

    // Body should contain meeting details: title, startTime, durationSeconds, transcript, etc.
    const meetingData = {
      ...body,
      userId: uid,
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore
    const docRef = await db.collection('meetings').add(meetingData);

    return NextResponse.json({ id: docRef.id, ...meetingData }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: err.message === 'Unauthorized' ? 401 : 400 });
  }
}
