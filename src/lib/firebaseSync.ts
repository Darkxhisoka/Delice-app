import {
  doc,
  setDoc,
  getDocs,
  collection,
  onSnapshot,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

/**
 * Sync a single document to Firestore
 */
export async function syncToFirestore(collectionName: string, docId: string, data: any) {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

/**
 * Batch sync multiple documents to Firestore efficiently
 */
export async function batchSyncToFirestore(collectionName: string, items: { id: string; [key: string]: any }[]) {
  if (!items || items.length === 0) return;
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      if (item.id) {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
      }
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collectionName);
  }
}

/**
 * Fetch all documents from a Firestore collection
 */
export async function fetchCollectionFromFirestore<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    querySnapshot.forEach((d) => {
      items.push(d.data() as T);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, collectionName);
    return [];
  }
}

/**
 * Real-time listener for Firestore collection changes
 */
export function subscribeCollectionFromFirestore<T>(
  collectionName: string,
  onData: (items: T[]) => void
): Unsubscribe {
  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as T);
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}
