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
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('id');

    if (meetingId) {
      // 1. Try fetching by doc ID
      const meetingDoc = await getDb().collection('meetings').doc(meetingId).get();
      if (meetingDoc.exists) {
        const data = meetingDoc.data();
        if (data?.userId === uid) {
          return NextResponse.json({ meeting: { id: meetingDoc.id, ...data } }, { headers: corsHeaders });
        }
      }

      // 2. Fallback: Query by internal 'id' field
      const querySnap = await getDb()
        .collection('meetings')
        .where('id', '==', meetingId)
        .where('userId', '==', uid)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        const doc = querySnap.docs[0];
        return NextResponse.json({ meeting: { id: doc.id, ...doc.data() } }, { headers: corsHeaders });
      }

      return NextResponse.json({ error: 'Meeting not found' }, { status: 404, headers: corsHeaders });
    }

    // Fetch all meetings for this user
    const meetingsSnapshot = await getDb()
      .collection('meetings')
      .where('userId', '==', uid)
      .get();

    const meetings = meetingsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        // Safe sort falling back to 0 if startTime is missing
        const timeA = (a.startTime as number) || new Date((a.createdAt as string) || (a.date as string) || 0).getTime() || 0;
        const timeB = (b.startTime as number) || new Date((b.createdAt as string) || (b.date as string) || 0).getTime() || 0;
        return timeB - timeA;
      });

    return NextResponse.json({ meetings }, { headers: corsHeaders });
  } catch (error) {
    const err = error as Error;
    console.error('Firestore GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  let uid: string;

  try {
    uid = await verifyAuth(request);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { audioBase64, audioUrl: passedAudioUrl, id: customId, ...rest } = body;

    const finalId = customId || rest.id || `meeting_${Date.now()}`;
    let audioUrl = passedAudioUrl || '';

    // If audioUrl wasn't already uploaded directly, upload audio to Cloudinary as fallback
    if (!audioUrl && audioBase64) {
      try {
        audioUrl = await uploadAudioToCloudinary(audioBase64, finalId);
        console.log('✅ Audio uploaded to Cloudinary (backend fallback):', audioUrl);
      } catch (cloudinaryErr) {
        console.error('⚠️ Audio upload to Cloudinary failed (saving transcript only):', cloudinaryErr);
      }
    }

    // Save to Firestore with specific doc ID (merge to avoid overwrites)
    const meetingData = {
      ...rest,
      id: finalId,
      userId: uid,
      audioUrl,
      createdAt: rest.createdAt || new Date().toISOString(),
    };

    await getDb().collection('meetings').doc(finalId).set(meetingData, { merge: true });

    return NextResponse.json({ id: finalId, ...meetingData }, { status: 201, headers: corsHeaders });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  let uid: string;

  try {
    uid = await verifyAuth(request);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('id');

    if (!meetingId) {
      return NextResponse.json({ error: 'Missing meeting id' }, { status: 400, headers: corsHeaders });
    }

    // Check direct doc ID first
    const directDoc = await getDb().collection('meetings').doc(meetingId).get();
    if (directDoc.exists && directDoc.data()?.userId === uid) {
      await directDoc.ref.delete();
      return NextResponse.json({ success: true, deletedId: meetingId }, { headers: corsHeaders });
    }

    // Fallback: Query by id field
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
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  let uid: string;

  try {
    uid = await verifyAuth(request);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing meeting id' }, { status: 400, headers: corsHeaders });
    }

    // 1. Check direct doc ID
    const docRef = getDb().collection('meetings').doc(id);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      if (docSnap.data()?.userId !== uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: corsHeaders });
      }
      await docRef.update(updates);
      return NextResponse.json({ success: true, updatedId: id }, { headers: corsHeaders });
    }

    // 2. Fallback: Check by 'id' field
    const querySnap = await getDb()
      .collection('meetings')
      .where('id', '==', id)
      .where('userId', '==', uid)
      .limit(1)
      .get();

    if (!querySnap.empty) {
      const matchDoc = querySnap.docs[0];
      await matchDoc.ref.update(updates);
      return NextResponse.json({ success: true, updatedId: id }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Meeting not found' }, { status: 404, headers: corsHeaders });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
