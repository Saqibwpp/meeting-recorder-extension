# Desktop App Auth & Bulletproof Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Firebase Authentication (Google OAuth + Email/Password Sign in & Sign up), integrate TanStack Query, refactor the desktop application into Bulletproof React patterns, adopt the warm editorial design system from the Embrace dashboard, and decouple recording logic.

**Architecture:** Refactor `desktop-app/src/renderer` into standard Bulletproof React directory layout (`features/auth`, `features/recorder`, `components/ui`, `lib`, `config`, `providers`). Add TanStack Query and Firebase Auth client with context. Replace the slate dark theme with Embrace's warm canvas palette.

**Tech Stack:** React 19, TypeScript, Vite, Electron, Firebase Auth, TanStack Query, Tailwind CSS v4, Lucide React.

**Spec:** [docs/superpowers/specs/2026-09-14-desktop-auth-and-bulletproof-refactor-design.md](file:///Users/saqibejazm1/Documents/meeting-recorder-extension/docs/superpowers/specs/2026-09-14-desktop-auth-and-bulletproof-refactor-design.md)

## Global Constraints
- Firebase configuration matching `embrace-ai-notetaker`.
- Preserve all existing Swift system audio capture and FFmpeg recording capabilities in Electron IPC.
- Maintain type safety across all components and hooks.

---

### Task 1: Install Dependencies & Setup Theme & Shared UI Components

**Files:**
- Modify: `desktop-app/package.json`
- Modify: `desktop-app/src/renderer/src/assets/main.css`
- Create: `desktop-app/src/renderer/src/components/ui/Button.tsx`
- Create: `desktop-app/src/renderer/src/components/ui/Input.tsx`
- Create: `desktop-app/src/renderer/src/components/ui/Card.tsx`
- Create: `desktop-app/src/renderer/src/components/ui/Alert.tsx`

**Interfaces:**
- Produces: `Button`, `Input`, `Card`, `Alert` styled components.

- [ ] **Step 1: Install `firebase` and `@tanstack/react-query` in desktop-app**
- [ ] **Step 2: Update `main.css` to configure Embrace warm editorial palette variables**
- [ ] **Step 3: Create UI primitives (`Button`, `Input`, `Card`, `Alert`)**
- [ ] **Step 4: Verify typecheck passes**

---

### Task 2: Configure Firebase, TanStack Query & Providers

**Files:**
- Create: `desktop-app/src/renderer/src/config/env.ts`
- Create: `desktop-app/src/renderer/src/lib/firebase.ts`
- Create: `desktop-app/src/renderer/src/lib/react-query.ts`
- Create: `desktop-app/src/renderer/src/providers/AppProvider.tsx`

**Interfaces:**
- Produces: `auth`, `queryClient`, `AppProvider`

- [ ] **Step 1: Create `config/env.ts` with Firebase environment constants**
- [ ] **Step 2: Create `lib/firebase.ts` initializing Firebase app and Auth**
- [ ] **Step 3: Create `lib/react-query.ts` configuring QueryClient**
- [ ] **Step 4: Create `providers/AppProvider.tsx` wrapping QueryClientProvider and AuthProvider**

---

### Task 3: Build Auth Feature (Email/Password, Google OAuth, Context & Forms)

**Files:**
- Create: `desktop-app/src/renderer/src/features/auth/api/auth.ts`
- Create: `desktop-app/src/renderer/src/features/auth/context/AuthContext.tsx`
- Create: `desktop-app/src/renderer/src/features/auth/hooks/useAuth.ts`
- Create: `desktop-app/src/renderer/src/features/auth/components/GoogleButton.tsx`
- Create: `desktop-app/src/renderer/src/features/auth/components/LoginForm.tsx`
- Create: `desktop-app/src/renderer/src/features/auth/components/SignupForm.tsx`
- Create: `desktop-app/src/renderer/src/features/auth/components/AuthCard.tsx`

**Interfaces:**
- Produces: `useAuth`, `AuthCard`, `GoogleButton`, `LoginForm`, `SignupForm`

- [ ] **Step 1: Create auth API functions (`signInWithEmail`, `signUpWithEmail`, `signInWithGooglePopup`, `signOut`)**
- [ ] **Step 2: Create `AuthContext` and `useAuth` hook**
- [ ] **Step 3: Create `GoogleButton`, `LoginForm`, `SignupForm`, and `AuthCard`**
- [ ] **Step 4: Test auth flows and type safety**

---

### Task 4: Modularize Recording Feature (Hooks, Device Selection, UI)

**Files:**
- Create: `desktop-app/src/renderer/src/features/recorder/hooks/useAudioDevices.ts`
- Create: `desktop-app/src/renderer/src/features/recorder/hooks/useMediaRecorder.ts`
- Create: `desktop-app/src/renderer/src/features/recorder/components/DeviceSelect.tsx`
- Create: `desktop-app/src/renderer/src/features/recorder/components/RecorderView.tsx`

**Interfaces:**
- Produces: `useAudioDevices`, `useMediaRecorder`, `RecorderView`

- [ ] **Step 1: Extract device enumeration and Bluetooth detection into `useAudioDevices.ts`**
- [ ] **Step 2: Extract audio/video stream mixing & Electron IPC recording into `useMediaRecorder.ts`**
- [ ] **Step 3: Create `DeviceSelect.tsx` with Bluetooth advisory alert**
- [ ] **Step 4: Create `RecorderView.tsx` with editorial styling**

---

### Task 5: Assemble App, Header & Clean Up Redundant Code

**Files:**
- Modify: `desktop-app/src/renderer/src/App.tsx`
- Modify: `desktop-app/src/renderer/src/main.tsx`
- Delete redundant/unused placeholder files (e.g. `Versions.tsx`, `base.css` if unused)

**Interfaces:**
- Produces: Full working desktop app with Auth gate + Top navigation bar + Recorder view.

- [ ] **Step 1: Update `App.tsx` to render navigation header (user email, sign out) and switch between `AuthCard` and `RecorderView`**
- [ ] **Step 2: Update `main.tsx` to wrap `App` in `AppProvider`**
- [ ] **Step 3: Clean up redundant code and verify linting & typecheck (`npm run typecheck`)**
- [ ] **Step 4: Run build (`npm run build`) and test Electron app**
