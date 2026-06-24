import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDApQg2-SmVZMH_QSRnV-cxkebJM9pNe6s',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'medium-3254d.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'medium-3254d',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'medium-3254d.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '738498502815',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:738498502815:web:8de585a10c52d33336c2aa',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-YL1SHX0HB2',
};

export const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app);
    })
    .catch(() => {
      analytics = null;
    });
}
