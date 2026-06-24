import { create } from 'zustand';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { AppUser } from '../types';
import { trackLogin } from '../services/visitService';

interface AuthState {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => () => void;
}

let hasTrackedLoginForSession = false;

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  profile: null,
  loading: true,
  error: null,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
      set({ error: message, loading: false });
      throw error;
    }
  },

  logout: async () => {
    await signOut(auth);
    hasTrackedLoginForSession = false;
    set({ firebaseUser: null, profile: null, loading: false, error: null });
  },

  bootstrap: () => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        set({ firebaseUser: null, profile: null, loading: false, initialized: true });
        hasTrackedLoginForSession = false;
        return;
      }

      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists()) {
        set({
          firebaseUser: user,
          profile: null,
          loading: false,
          initialized: true,
          error: 'Your Auth account exists, but no user profile was found in Firestore.',
        });
        return;
      }

      const profile = { uid: user.uid, ...snap.data() } as AppUser;
      if (!profile.active) {
        await signOut(auth);
        set({ firebaseUser: null, profile: null, loading: false, initialized: true, error: 'This user is inactive.' });
        return;
      }

      set({ firebaseUser: user, profile, loading: false, initialized: true, error: null });

      if (!hasTrackedLoginForSession) {
        hasTrackedLoginForSession = true;
        trackLogin(profile).catch(() => undefined);
      }
    });
  },
}));

export const canEdit = (profile: AppUser | null) => profile?.role === 'superAdmin' || profile?.role === 'callCenterAdmin';
export const isSuperAdmin = (profile: AppUser | null) => profile?.role === 'superAdmin';
export const canUploadForCenter = (profile: AppUser | null, callCenterId: string) =>
  profile?.role === 'superAdmin' || (profile?.role === 'callCenterAdmin' && profile.callCenterId === callCenterId);
