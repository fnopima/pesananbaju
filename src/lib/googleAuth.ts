import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
// Force prompt to ensure access tokens and scopes are refreshed
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might have expired or refreshed; if not yet in cache, failure callback notifies UI
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    const errObj = error as { code?: string; message?: string };
    // If the user deliberately closes the popup, treat it gracefully without throwing an uncaught red error
    if (errObj?.code === 'auth/popup-closed-by-user') {
      return null;
    }
    if (errObj?.code === 'auth/popup-blocked') {
      throw new Error('Jendela login Google diblokir oleh browser. Harap izinkan popup di browser Anda atau buka aplikasi di tab browser baru.');
    }
    if (errObj?.code === 'auth/cancelled-popup-request') {
      return null;
    }
    if (errObj?.code === 'auth/unauthorized-domain') {
      throw new Error(
        `Domain '${window.location.hostname}' belum terdaftar di Firebase Authorized Domains. Harap tambahkan domain GitHub ini di Firebase Console > Authentication > Settings > Authorized domains.`
      );
    }
    if (errObj?.code === 'auth/network-request-failed') {
      throw new Error(
        'Koneksi login Google terhalang atau gagal (network-request-failed). Jika Anda menggunakan preview dalam frame, silakan buka aplikasi di tab browser baru atau periksa koneksi internet.'
      );
    }
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
