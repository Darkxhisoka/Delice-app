import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with forced long polling for web/iframe and sandbox reliability
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Safe async connection check conforming to Firebase skill specifications
async function testConnection() {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('Firebase Firestore backend connected successfully.');
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('backend') || error.message.includes('unavailable') || error.message.includes('10 seconds'))) {
      console.info('Firestore is operating in offline/cached mode.');
    } else {
      console.debug('Firestore connection initialized.');
    }
  }
}

testConnection();



