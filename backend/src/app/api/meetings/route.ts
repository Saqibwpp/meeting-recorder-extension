import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { uploadAudioToCloudinary } from '@/lib/cloudinary';
import { getCorsHeaders, handleOptions } from '@/lib/cors';
import { verifyAuth } from '@/lib/auth';

export async function OPTIONS(request: Request) {
  return handleOptions(request);
}

export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  let uid: string;

  try {
    uid = await verifyAuth(request);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
  }

  try {
    // Fetch meetings for this user
    const meetingsSnapshot = await getDb()
      .collection('meetings')
      .where('userId', '==', uid)
      .get();

    const meetings = meetingsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      // @ts-expect-error - sorting generic data
      .sort((a, b) => b.startTime - a.startTime);

    return NextResponse.json({ meetings }, { headers: corsHeaders });
  } catch (error) {
    const err = error as Error;
    console.error('Firestore GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const uid = await verifyAuth(request);
    const body = await request.json();

    const { audioBase64, audioUrl: passedAudioUrl, id: meetingId, ...rest } = body;

    let audioUrl = passedAudioUrl || '';

    // If audioUrl wasn't already uploaded directly, upload audio to Cloudinary as fallback
    if (!audioUrl && audioBase64 && meetingId) {
      try {
        audioUrl = await uploadAudioToCloudinary(audioBase64, meetingId);
        console.log('✅ Audio uploaded to Cloudinary (backend fallback):', audioUrl);
      } catch (cloudinaryErr) {
        console.error('⚠️ Audio upload to Cloudinary failed (saving transcript only):', cloudinaryErr);
      }
    }

    // Save to Firestore (lightweight metadata with the Cloudinary URL)
    const meetingData = {
      ...rest,
      id: meetingId,
      userId: uid,
      audioUrl,
      createdAt: new Date().toISOString(),
    };

    const docRef = await getDb().collection('meetings').add(meetingData);

    return NextResponse.json({ id: docRef.id, ...meetingData }, { status: 201, headers: corsHeaders });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message },
      { status: err.message === 'Unauthorized' ? 401 : 400, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const uid = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('id');

    if (!meetingId) {
      return NextResponse.json({ error: 'Missing meeting id' }, { status: 400, headers: corsHeaders });
    }

    const snapshot = await getDb()
      .collection('meetings')
      .where('id', '==', meetingId)
      .where('userId', '==', uid)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Meeting not found or unauthorized' }, { status: 404, headers: corsHeaders });
    }

    const batch = getDb().batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ success: true, deletedId: meetingId }, { headers: corsHeaders });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message },
      { status: err.message === 'Unauthorized' ? 401 : 500, headers: corsHeaders }
    );
  }
}
