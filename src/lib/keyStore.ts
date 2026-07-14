/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'SecureMessengerKeys';
const STORE_NAME = 'privateKeys';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open key storage database.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Saves the user's private key (as PKCS8 Base64 string) in IndexedDB.
 * This ensures the private key never leaves the client device.
 */
export async function savePrivateKey(uid: string, privateKeyB64: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(privateKeyB64, uid);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save private key.'));
    };
  });
}

/**
 * Retrieves the user's private key (as PKCS8 Base64 string) from IndexedDB.
 */
export async function getPrivateKey(uid: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(uid);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve private key.'));
    };
  });
}

/**
 * Removes the user's private key from IndexedDB (e.g. upon explicit sign out on shared device).
 */
export async function deletePrivateKey(uid: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(uid);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete private key.'));
    };
  });
}
