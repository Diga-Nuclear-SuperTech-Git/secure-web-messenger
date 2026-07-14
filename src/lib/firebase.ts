/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Always specify the databaseId when custom database is used, fallback to '(default)'
export const db = initializeFirestore(
  app,
  {},
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard OAuth setup helper
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
