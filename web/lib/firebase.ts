'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase web config is public by design — it identifies the project, it does
// not authorise anything. What actually protects data is Firestore rules
// (see firestore.rules) plus the fact that questions live in Postgres, not here.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.projectId);

let app: FirebaseApp | null = null;

/**
 * Returns the Firebase app, or null when the env vars aren't filled in yet.
 * Everything Firebase-backed (sign-in, group-race rooms) is optional: the
 * practice flow works without it, so a half-configured .env.local still runs.
 */
export function firebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function firebaseAuth(): Auth | null {
  const a = firebaseApp();
  return a ? getAuth(a) : null;
}

export function firestore(): Firestore | null {
  const a = firebaseApp();
  return a ? getFirestore(a) : null;
}
