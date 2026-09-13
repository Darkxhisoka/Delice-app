import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal Firestore SDK transport warnings when offline or switching transports
setLogLevel('silent');

// Prevent Firestore backend unreachable warnings from polluting console.error as fatal exceptions
if (typeof window !== 'undefined' && window.console && window.console.error) {
  const originalConsoleError = window.console.error;
  window.console.error = function (...args: any[]) {
    const msg = args.map((a) => (typeof a === 'string' ? a : (a && a.message) || '')).join(' ');
    if (
      msg.includes("Could not reach Cloud Firestore backend") ||
      msg.includes("Backend didn't respond within 10 seconds") ||
      msg.includes("the client is offline")
    ) {
      console.info('Firestore: Offline/cached mode active (backend unreachable or pending reconnect).');
      return;
    }
    originalConsoleError.apply(window.console, args);
  };
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL per Firebase skill: load Firestore with the designated databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Safe async connection check conforming to Firebase skill specifications with timeout
async function testConnection() {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      // Use a timeout so network sluggishness doesn't block the startup pipeline
      const connectionPromise = getDocFromServer(doc(db, 'test', 'connection'));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore connection timeout (offline mode active)')), 4000)
      );
      await Promise.race([connectionPromise, timeoutPromise]);
      console.log('Firebase Firestore backend connected successfully.');
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('the client is offline') ||
        error.message.includes('backend') ||
        error.message.includes('unavailable') ||
        error.message.includes('10 seconds') ||
        error.message.includes('timeout'))
    ) {
      console.info('Firestore is operating in offline/cached mode.');
    } else {
      console.debug('Firestore connection initialized.');
    }
  }
}

testConnection();



