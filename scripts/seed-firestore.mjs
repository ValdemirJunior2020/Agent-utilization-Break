import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDApQg2-SmVZMH_QSRnV-cxkebJM9pNe6s',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'medium-3254d.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'medium-3254d',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'medium-3254d.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '738498502815',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:738498502815:web:8de585a10c52d33336c2aa',
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-YL1SHX0HB2',
};

const callCenters = [
  { id: 'wns', name: 'WNS', active: true },
  { id: 'teleperformance', name: 'Teleperformance', active: true },
  { id: 'buwelo-colombia', name: 'Buwelo Colombia', region: 'Colombia', active: true },
  { id: 'buwelo-ghana', name: 'Buwelo Ghana', region: 'Ghana', active: true },
  { id: 'concentrix', name: 'Concentrix', active: true },
  { id: 'telus', name: 'Telus', active: true },
];

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD. Create the first Super Admin in Firebase Console first, then run this script.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const credential = await signInWithEmailAndPassword(auth, email, password);

for (const center of callCenters) {
  await setDoc(doc(db, 'callCenters', center.id), { ...center, createdAt: serverTimestamp() }, { merge: true });
}

await setDoc(doc(db, 'settings', 'thresholds'), {
  goodMaxMinutes: 60,
  warningMinMinutes: 60.01,
  criticalMinMinutes: 90,
  updatedAt: serverTimestamp(),
  updatedBy: credential.user.uid,
}, { merge: true });

console.log('Seed complete: callCenters and threshold settings are ready.');
