import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { getDb } from '@/lib/firebase-admin';
import { verifyMcpAuth } from '@/lib/mcp-auth';
import { MeetingDocument } from '@/types/mcp';

interface McpToolContext {
  http?: {
    req?: Request;
  };
  [key: string]: unknown;
}

// Helper to resolve the authenticated userId from the ServerContext
async function getUserIdFromContext(ctx: McpToolContext): Promise<string> {
  const req = ctx.http?.req;
  const reqAuth = (req as unknown as { auth?: { clientId?: string } })?.auth;
  if (reqAuth?.clientId) {
    return reqAuth.clientId;
  }
  const authHeader = req?.headers?.get('authorization');
  if (authHeader) {
    const authResult = await verifyMcpAuth(authHeader);
    return authResult.userId;
  }
  throw new Error('Unauthorized: Missing or invalid authentication credentials');
}

const handler = createMcpHandler(
  (server) => {
    // -------------------------------------------------------------------------
    // Tool 1: list_meetings
    // -------------------------------------------------------------------------
    server.registerTool(
      'list_meetings',
      {
        title: 'List Meetings',
        description: 'List recent recorded meetings with title, date, duration, summary, and action item counts.',
        inputSchema: z.object({
          limit: z
            .number()
            .min(1)
            .max(50)
            .default(10)
            .describe('Number of recent meetings to retrieve (default: 10, max: 50)'),
        }),
      },
      async ({ limit }, ctx) => {
        try {
          const uid = await getUserIdFromContext(ctx);
          const snapshot = await getDb()
            .collection('meetings')
            .where('userId', '==', uid)
            .get();

          const meetings = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                title: data.title || 'Untitled Meeting',
                startTime: data.startTime,
                durationSeconds: data.durationSeconds,
                audioUrl: data.audioUrl || '',
                createdAt: data.createdAt,
                summary: data.transcript?.summary || '',
                actionItemsCount: Array.isArray(data.transcript?.actionItems)
                  ? data.transcript.actionItems.length
                  : 0,
              };
            })
            .sort((a, b) => Number(b.startTime || 0) - Number(a.startTime || 0))
            .slice(0, limit);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(meetings, null, 2),
              },
            ],
          };
        } catch (error) {
          const err = error as Error;
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to list meetings: ${err.message}` }],
          };
        }
      }
    );

    // -------------------------------------------------------------------------
    // Tool 2: get_meeting_transcript
    // -------------------------------------------------------------------------
    server.registerTool(
      'get_meeting_transcript',
      {
        title: 'Get Meeting Transcript',
        description:
          'Retrieve the complete speaker-diarized transcript, executive summary, action items, and audio stream URL for a specific meeting.',
        inputSchema: z.object({
          meetingId: z.string().describe('The unique ID of the meeting'),
        }),
      },
      async ({ meetingId }, ctx) => {
        try {
          const uid = await getUserIdFromContext(ctx);
          let doc = await getDb().collection('meetings').doc(meetingId).get();

          if (!doc.exists || doc.data()?.userId !== uid) {
            // Fallback search by 'id' attribute in Firestore
            const querySnap = await getDb()
              .collection('meetings')
              .where('id', '==', meetingId)
              .where('userId', '==', uid)
              .limit(1)
              .get();

            if (querySnap.empty) {
              return {
                isError: true,
                content: [
                  {
                    type: 'text',
                    text: `Meeting with ID '${meetingId}' was not found or does not belong to your account.`,
                  },
                ],
              };
            }
            doc = querySnap.docs[0];
          }

          const data = doc.data()!;
          const payload = {
            id: doc.id,
            title: data.title || 'Untitled Meeting',
            startTime: data.startTime,
            durationSeconds: data.durationSeconds,
            audioUrl: data.audioUrl || '',
            summary: data.transcript?.summary || '',
            actionItems: data.transcript?.actionItems || [],
            segments: data.transcript?.segments || [],
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(payload, null, 2),
              },
            ],
          };
        } catch (error) {
          const err = error as Error;
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to get transcript: ${err.message}` }],
          };
        }
      }
    );

    // -------------------------------------------------------------------------
    // Tool 3: search_meetings
    // -------------------------------------------------------------------------
    server.registerTool(
      'search_meetings',
      {
        title: 'Search Meetings',
        description:
          'Search across past meeting titles, summaries, and dialogue transcripts for specific keywords or discussion topics.',
        inputSchema: z.object({
          query: z
            .string()
            .describe('Search keyword or topic (e.g. "budget", "roadmap", "architecture", "deployment")'),
          limit: z
            .number()
            .min(1)
            .max(20)
            .default(10)
            .describe('Maximum number of matching meetings to return (default: 10)'),
        }),
      },
      async ({ query, limit }, ctx) => {
        try {
          const uid = await getUserIdFromContext(ctx);
          const snapshot = await getDb()
            .collection('meetings')
            .where('userId', '==', uid)
            .get();

          const lowerQuery = query.toLowerCase();
          const results = [];

          for (const doc of snapshot.docs) {
            const data = doc.data();
            const titleMatch = (data.title || '').toLowerCase().includes(lowerQuery);
            const summaryMatch = (data.transcript?.summary || '').toLowerCase().includes(lowerQuery);
            const segments = Array.isArray(data.transcript?.segments) ? data.transcript.segments : [];
            const matchingSegments = segments.filter((s: { text?: string; speaker?: string }) =>
              (s.text || '').toLowerCase().includes(lowerQuery)
            );

            if (titleMatch || summaryMatch || matchingSegments.length > 0) {
              results.push({
                id: doc.id,
                title: data.title || 'Untitled Meeting',
                startTime: data.startTime,
                summary: data.transcript?.summary || '',
                matchedInTitle: titleMatch,
                matchedInSummary: summaryMatch,
                totalMatchingSegments: matchingSegments.length,
                sampleExcerpts: matchingSegments.slice(0, 3).map((s: { speaker?: string; text?: string }) => ({
                  speaker: s.speaker || 'Unknown',
                  text: s.text,
                })),
              });
            }
          }

          results.sort((a, b) => Number(b.startTime || 0) - Number(a.startTime || 0));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results.slice(0, limit), null, 2),
              },
            ],
          };
        } catch (error) {
          const err = error as Error;
          return {
            isError: true,
            content: [{ type: 'text', text: `Search failed: ${err.message}` }],
          };
        }
      }
    );

    // -------------------------------------------------------------------------
    // Tool 4: get_action_items
    // -------------------------------------------------------------------------
    server.registerTool(
      'get_action_items',
      {
        title: 'Get Action Items',
        description: 'Aggregate and list pending action items and tasks across recent meetings.',
        inputSchema: z.object({
          limitMeetings: z
            .number()
            .min(1)
            .max(30)
            .default(10)
            .describe('Number of recent meetings to scan for action items (default: 10)'),
        }),
      },
      async ({ limitMeetings }, ctx) => {
        try {
          const uid = await getUserIdFromContext(ctx);
          const snapshot = await getDb()
            .collection('meetings')
            .where('userId', '==', uid)
            .get();

          const sortedMeetings: MeetingDocument[] = snapshot.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<MeetingDocument, 'id'>) }))
            .sort((a, b) => Number(b.startTime || 0) - Number(a.startTime || 0))
            .slice(0, limitMeetings);

          const groupedActionItems = sortedMeetings
            .filter((m) => Array.isArray(m.transcript?.actionItems) && m.transcript.actionItems.length > 0)
            .map((m) => ({
              meetingId: m.id,
              meetingTitle: m.title || 'Untitled Meeting',
              startTime: m.startTime,
              actionItems: m.transcript?.actionItems,
            }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(groupedActionItems, null, 2),
              },
            ],
          };
        } catch (error) {
          const err = error as Error;
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to retrieve action items: ${err.message}` }],
          };
        }
      }
    );
  },
  {
    serverInfo: {
      name: 'embrace-ai-meeting-recorder',
      version: '1.0.0',
    },
  }
);

// Wrap handler with authentication verification
export const POST = withMcpAuth(
  handler,
  async (req, bearerToken) => {
    const rawAuth = bearerToken || req.headers.get('authorization') || '';
    if (!rawAuth) return undefined;

    try {
      const authContext = await verifyMcpAuth(rawAuth);
      return {
        token: rawAuth,
        clientId: authContext.userId,
        expiresAt: Math.floor(Date.now() / 1000) + 3600 * 24 * 365, // 1 year validity
        scopes: ['meetings:read'],
      };
    } catch {
      return undefined;
    }
  },
  {
    required: false, // Allows the handler to gracefully manage/fallback inside tool callbacks
  }
);

export const GET = POST;
