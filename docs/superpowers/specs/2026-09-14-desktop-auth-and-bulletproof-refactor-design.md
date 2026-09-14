# Desktop App Auth and Bulletproof React Refactor Design Spec

## 1. Overview
The goal of this initiative is to elevate the Electron desktop application (`desktop-app`) from a prototype state into an enterprise-grade, cohesive interface that mirrors the Embrace AI brand design language (seen in the Next.js backend and Chrome extension).

The immediate scope focuses on:
1. Implementing Authentication (Sign In, Sign Up, and Google OAuth via Firebase).
2. Refactoring the frontend using **Bulletproof React** architectural patterns (features, shared UI components, hooks, providers).
3. Integrating **TanStack Query** for client-side state caching.
4. Redesigning the UI with Embrace's warm editorial aesthetic (`#faf9f6`, `#1a1a1a`, `#e2e0d8`).
5. Modularizing and cleaning up the recording flows to eliminate monolithic component code and redundant logic.

---

## 2. Architecture & Directory Structure

Inside `desktop-app/src/renderer/src/`:

```
├── assets/
│   └── main.css                # Global theme variables & Tailwind imports
├── components/
│   └── ui/
│       ├── Button.tsx          # Reusable styled button with variants & loading state
│       ├── Input.tsx           # Styled text/password inputs with error state
│       ├── Card.tsx            # Editorial card containers
│       └── Alert.tsx           # Alerts for warnings/errors (e.g., Bluetooth audio notice)
├── config/
│   └── env.ts                  # Firebase credentials and environment constants
├── features/
│   ├── auth/
│   │   ├── api/                # Firebase auth helpers (email/pass login, signup, google popup, logout)
│   │   ├── components/
│   │   │   ├── AuthCard.tsx    # Auth container card
│   │   │   ├── LoginForm.tsx   # Email/Password + Google Login
│   │   │   ├── SignupForm.tsx  # Registration form
│   │   │   └── GoogleButton.tsx# Branded Google sign-in button
│   │   ├── context/
│   │   │   └── AuthContext.tsx # React Context for Firebase user state
│   │   └── hooks/
│   │       └── useAuth.ts      # Auth state consumer hook
│   └── recorder/
│       ├── components/
│       │   ├── RecorderView.tsx# Recording controls & status UI in Embrace style
│       │   └── DeviceSelect.tsx# Audio device dropdown & Bluetooth detector
│       └── hooks/
│           ├── useAudioDevices.ts
│           └── useMediaRecorder.ts
├── lib/
│   ├── firebase.ts             # Initialized Firebase client & auth
│   └── react-query.ts          # TanStack QueryClient setup
├── providers/
│   └── AppProvider.tsx         # Combined QueryClientProvider + AuthProvider
├── App.tsx                     # Top-level view switcher (Auth screen vs Main Dashboard/Recorder)
└── main.tsx
```

---

## 3. Component Details & Data Flow

### 3.1 Authentication Flow
- **Firebase Initialization (`lib/firebase.ts`)**: Initializes Firebase Auth instance using credentials from `.env` or project defaults.
- **`AuthContext.tsx`**: Listens to `onAuthStateChanged(auth, callback)`. Exposes `{ user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOutUser }`.
- **`GoogleButton.tsx`**: Calls `signInWithPopup(auth, new GoogleAuthProvider())` to handle authentication directly in the Electron renderer window.
- **Top Bar**: When authenticated, displays the Embrace AI logo, user email, and a minimal Sign Out button.

### 3.2 Recording Flow (`features/recorder/`)
- **`useAudioDevices.ts`**: Handles audio device enumeration, auto-refresh on `devicechange`, and detection of Bluetooth/wireless devices.
- **`useMediaRecorder.ts`**: Encapsulates media stream capture (macOS Swift system audio vs Windows loopback), audio mixing via `AudioContext`, and post-recording FFmpeg merging via Electron IPC.
- **`RecorderView.tsx`**: Warm editorial styling matching the extension/dashboard aesthetic, replacing the dark slate theme.

---

## 4. Dependencies
Add to `desktop-app/package.json`:
- `firebase`: `^12.18.0`
- `@tanstack/react-query`: `^5.66.0`

---

## 5. Verification Plan
1. **Type & Lint Check**: Run `npm run typecheck` in `desktop-app`.
2. **Build Verification**: Run `npm run build` in `desktop-app`.
3. **Runtime Verification**:
   - Verify unauthenticated view shows Embrace-styled Auth card with Email and Google Sign-in options.
   - Verify switching between Sign In and Sign Up modes.
   - Verify Google OAuth popup trigger and Email login.
   - Verify authenticated state mounts header and Recorder view.
   - Verify recording functionality remains fully intact with Swift/FFmpeg system audio capture.
