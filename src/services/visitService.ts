import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppUser } from '../types';
import { writeAuditLog } from './auditService';

export async function trackAppVisit(user: AppUser, path = window.location.pathname) {
  await addDoc(collection(db, 'appVisits'), {
    userId: user.uid,
    userName: user.name,
    userEmail: user.email,
    callCenterId: user.callCenterId,
    callCenterName: user.callCenterName,
    path,
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp(),
  });
}

export async function trackLogin(user: AppUser) {
  await updateDoc(doc(db, 'users', user.uid), {
    lastLoginAt: serverTimestamp(),
    loginCount: increment(1),
  });
  await writeAuditLog({
    actionType: 'login',
    actor: user,
    description: 'User logged in.',
  });
  await trackAppVisit(user, '/login');
}
