import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

const password = '123456789';
const superAdmins = [
  { email: 'valdemir.goncalves@hotelplanner.com', name: 'Valdemir Goncalves' },
  { email: 'April.Grantham@HotelPlanner.com', name: 'April Grantham' },
  { email: 'Jim.Fryer@HotelPlanner.com', name: 'Jim Fryer' },
];

async function upsertSuperAdmin({ email, name }) {
  const normalizedEmail = email.trim();
  let user;

  try {
    user = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(user.uid, {
      password,
      displayName: name,
      emailVerified: true,
      disabled: false,
    });
    console.log(`Updated Firebase Auth user: ${normalizedEmail} -> ${user.uid}`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;

    user = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName: name,
      emailVerified: true,
      disabled: false,
    });
    console.log(`Created Firebase Auth user: ${normalizedEmail} -> ${user.uid}`);
  }

  await db.collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      name,
      email: normalizedEmail,
      role: 'superAdmin',
      callCenterId: null,
      callCenterName: null,
      active: true,
      loginCount: 0,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection('auditLogs').add({
    actionType: 'user_updated',
    userId: user.uid,
    userName: name,
    userEmail: normalizedEmail,
    userRole: 'superAdmin',
    callCenterId: null,
    callCenterName: null,
    createdAt: FieldValue.serverTimestamp(),
    affectedRecordId: user.uid,
    description: 'Super Admin user created/updated by CLI script.',
    newValue: { email: normalizedEmail, role: 'superAdmin', active: true },
  });

  return user;
}

for (const admin of superAdmins) {
  await upsertSuperAdmin(admin);
}

await db.collection('settings').doc('thresholds').set(
  {
    goodMaxMinutes: 60,
    warningMinMinutes: 60.01,
    criticalMinMinutes: 90,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'create-super-admins-cli',
  },
  { merge: true },
);

console.log('\nSUPER ADMINS READY');
for (const admin of superAdmins) {
  console.log(`Email: ${admin.email} | Password: ${password}`);
}
console.log('');
process.exit(0);
