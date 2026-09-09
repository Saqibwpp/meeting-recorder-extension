# MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a secure Model Context Protocol (MCP) server endpoint inside the Next.js backend with 4 meeting tools, dual-mode auth (API key + Firebase ID token), and a web dashboard for AI assistant connectivity.

**Architecture:** Next.js App Router route (`/api/mcp`) using `mcp-handler` and `@modelcontextprotocol/sdk` to expose JSON-RPC & SSE tools over HTTP, authenticated via `withMcpAuth` with Firestore API key lookup and Firebase Admin token verification.

**Tech Stack:** Next.js 16 App Router, `@modelcontextprotocol/sdk`, `mcp-handler`, `zod`, Firebase Admin Firestore, React 19.

**Spec:** `docs/superpowers/specs/2026-09-09-mcp-server-design.md`

## Global Constraints
- Target Framework: Next.js 16 App Router (`backend/src/app/api/`)
- Database: Firestore via `backend/src/lib/firebase-admin.ts`
- Data Scope: Strict user isolation (`where('userId', '==', uid)`)
- Package dependencies: `@modelcontextprotocol/sdk`, `mcp-handler`, `zod` installed in `backend/`

---

### Task 1: Install MCP Dependencies & Core Types

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/types/mcp.ts`

**Interfaces:**
- Produces: `ApiKeyRecord` type, `McpAuthContext` type

- [ ] **Step 1: Install packages in backend**
```bash
cd backend && npm install mcp-handler @modelcontextprotocol/sdk zod
```

- [ ] **Step 2: Create MCP and Auth types**
Create `backend/src/types/mcp.ts` defining:
```typescript
export interface ApiKeyRecord {
  apiKey: string;
  userId: string;
  name: string;
  createdAt: string;
  revoked: boolean;
}

export interface McpAuthContext {
  userId: string;
  authMethod: 'api_key' | 'firebase_token';
}
```

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npm --prefix backend run build` (or typecheck)

---

### Task 2: Auth Verification Bridge & API Key Generator

**Files:**
- Create: `backend/src/lib/mcp-auth.ts`
- Create: `backend/src/app/api/auth/key/route.ts`

**Interfaces:**
- Produces: `verifyMcpAuth(authHeader: string | null): Promise<McpAuthContext>`
- Produces: `generateUserApiKey(userId: string, name?: string): Promise<string>`
- Produces: `getUserApiKeys(userId: string): Promise<ApiKeyRecord[]>`
- Produces: `revokeUserApiKey(userId: string, apiKey: string): Promise<boolean>`

- [ ] **Step 1: Write `backend/src/lib/mcp-auth.ts`**
Implements crypto-secure key generation (`embrace_live_...`), Firestore storage in `apiKeys` collection, verification against both Firebase ID token and Firestore `apiKeys`.

- [ ] **Step 2: Write `backend/src/app/api/auth/key/route.ts`**
Next.js route handler supporting:
- `GET`: Get user's active API keys (requires Firebase Bearer auth).
- `POST`: Generate new API key for authenticated user.
- `DELETE`: Revoke an API key.

- [ ] **Step 3: Test key generation & verification**
Create a test script in `backend/src/scripts/test-mcp-auth.ts` or curl against `/api/auth/key`.

---

### Task 3: MCP Server Endpoint & 4 Meeting Tools

**Files:**
- Create: `backend/src/app/api/mcp/route.ts`

**Interfaces:**
- Consumes: `verifyMcpAuth` from `backend/src/lib/mcp-auth.ts`, `getDb` from `backend/src/lib/firebase-admin.ts`
- Produces: MCP tools: `list_meetings`, `get_meeting_transcript`, `search_meetings`, `get_action_items`

- [ ] **Step 1: Implement `backend/src/app/api/mcp/route.ts`**
Configure `createMcpHandler` registering:
1. `list_meetings`: Queries Firestore `meetings` collection with `where('userId', '==', authContext.userId)`.
2. `get_meeting_transcript`: Fetches specific meeting by ID verifying ownership, returning diarized segments, summary, and Cloudinary audio streaming URL.
3. `search_meetings`: Queries meetings and performs search across `title`, `summary`, and `transcript.segments`.
4. `get_action_items`: Scans recent meetings and aggregates `transcript.actionItems`.

- [ ] **Step 2: Wrap with `withMcpAuth`**
Inject `authContext` containing `userId` and export `GET` and `POST` handlers.

- [ ] **Step 3: Verification with JSON-RPC test request**
Send sample MCP Initialize and `tools/list` request using `curl` to verify response.

---

### Task 4: Connect AI Dashboard UI & Copy Snippets

**Files:**
- Create: `backend/src/app/dashboard/page.tsx`
- Modify: `backend/src/app/page.tsx` (Update "View Dashboard" link)

**Interfaces:**
- Consumes: `/api/auth/key` and Firebase client auth.

- [ ] **Step 1: Create Dashboard UI in `backend/src/app/dashboard/page.tsx`**
Includes:
- Firebase Google Sign-In button / User Profile card.
- **"Connect Your AI Assistant"** section:
  - Button to Generate / Copy Personal API Key.
  - Interactive Tabs: **Cursor / Windsurf**, **Claude Desktop**, **Antigravity / Gemini**.
  - 1-Click Copy code blocks with pre-populated keys and backend URL (`https://meeting-recorder-extension.vercel.app/api/mcp`).
- Recent meetings preview list.

- [ ] **Step 2: Link Landing Page to Dashboard**
Update `backend/src/app/page.tsx` so "View Dashboard" navigates to `/dashboard`.

---

### Task 5: End-to-End Verification & Documentation

**Files:**
- Create: `docs/MCP_SETUP_GUIDE.md`

- [ ] **Step 1: End-to-End testing with MCP Inspector / Antigravity**
Connect to the local / staging MCP server and invoke `list_meetings` and `search_meetings`.

- [ ] **Step 2: Write clear setup guide**
Create `docs/MCP_SETUP_GUIDE.md` with instructions for teammates to connect Cursor, Claude Desktop, and Claude.ai.
