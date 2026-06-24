import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';
import type { AppUser, Role } from '../types';
import { writeAuditLog } from './auditService';

export async function getUsers(): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('name', 'asc')));
  return snap.docs.map((item) => ({ uid: item.id, ...item.data() }) as AppUser);
}

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  callCenterId: string | null;
  callCenterName: string | null;
}

export async function createManagedUser(input: CreateUserInput, actor: AppUser) {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  const credential = await createUserWithEmailAndPassword(secondaryAuth, input.email, input.password);

  const userProfile: AppUser = {
    uid: credential.user.uid,
    name: input.name,
    email: input.email,
    role: input.role,
    callCenterId: input.callCenterId,
    callCenterName: input.callCenterName,
    active: true,
    createdBy: actor.uid,
  };

  await setDoc(doc(db, 'users', credential.user.uid), {
    ...userProfile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    loginCount: 0,
  });

  await writeAuditLog({
    actionType: 'user_created',
    actor,
    callCenterId: input.callCenterId,
    callCenterName: input.callCenterName,
    affectedRecordId: credential.user.uid,
    newValue: { ...input, password: 'hidden' },
    description: 'Managed user created.',
  });

  await signOut(secondaryAuth);
  await deleteApp(secondaryApp);
  return credential.user.uid;
}

export async function updateManagedUser(uid: string, updates: Partial<AppUser>, actor: AppUser) {
  await updateDoc(doc(db, 'users', uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    actionType: updates.role ? 'role_changed' : 'user_updated',
    actor,
    callCenterId: updates.callCenterId,
    callCenterName: updates.callCenterName,
    affectedRecordId: uid,
    newValue: updates,
    description: 'Managed user updated.',
  });
}
