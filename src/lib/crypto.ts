/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper to convert Uint8Array to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to Uint8Array
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate RSA-OAEP 2048-bit key pair with SHA-256
export async function generateE2EKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: 'SHA-256' },
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

// Export public key to SPKI Base64 format
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  return arrayBufferToBase64(exported);
}

// Export private key to PKCS8 Base64 format
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('pkcs8', key);
  return arrayBufferToBase64(exported);
}

// Import public key from SPKI Base64
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64);
  return await window.crypto.subtle.importKey(
    'spki',
    buffer,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' },
    },
    true,
    ['encrypt']
  );
}

// Import private key from PKCS8 Base64
export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(base64);
  return await window.crypto.subtle.importKey(
    'pkcs8',
    buffer,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' },
    },
    true,
    ['decrypt']
  );
}

interface EncryptResult {
  encryptedText: string;
  iv: string;
  keyForSender: string;
  keyForRecipient: string;
}

// Encrypt a message using AES-GCM and encrypt the AES key for both sender and recipient using RSA-OAEP
export async function encryptMessage(
  plainText: string,
  recipientPublicKeyB64: string,
  senderPublicKeyB64: string
): Promise<EncryptResult> {
  // 1. Generate random 256-bit AES-GCM symmetric key
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Generate random 12-byte IV (Initialization Vector)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt the plain text with AES-GCM
  const encoder = new TextEncoder();
  const plainData = encoder.encode(plainText);
  const encryptedBuf = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    plainData
  );

  // 4. Export the raw AES key material
  const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);

  // 5. Import sender and recipient public keys
  const recipientKey = await importPublicKey(recipientPublicKeyB64);
  const senderKey = await importPublicKey(senderPublicKeyB64);

  // 6. Encrypt raw AES key with recipient's RSA public key
  const encryptedKeyForRecipient = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientKey,
    exportedAesKey
  );

  // 7. Encrypt raw AES key with sender's RSA public key
  const encryptedKeyForSender = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    senderKey,
    exportedAesKey
  );

  return {
    encryptedText: arrayBufferToBase64(encryptedBuf),
    iv: arrayBufferToBase64(iv),
    keyForRecipient: arrayBufferToBase64(encryptedKeyForRecipient),
    keyForSender: arrayBufferToBase64(encryptedKeyForSender),
  };
}

// Decrypt a message's AES key using user's RSA private key, then decrypt the message text using AES-GCM
export async function decryptMessage(
  encryptedText: string,
  ivB64: string,
  encryptedAesKeyB64: string,
  privateKey: CryptoKey
): Promise<string> {
  try {
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedAesKeyB64);

    // 1. Decrypt the AES key using user's private RSA key
    const decryptedAesKeyBuf = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedKeyBuffer
    );

    // 2. Import the decrypted raw AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      decryptedAesKeyBuf,
      { name: 'AES-GCM' },
      true,
      ['decrypt']
    );

    // 3. Decrypt the message ciphertext with the AES key
    const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
    const cipherData = base64ToArrayBuffer(encryptedText);

    const decryptedBuf = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      cipherData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuf);
  } catch (error) {
    console.error('E2EE Decryption failed:', error);
    throw new Error('Could not decrypt message (key mismatch or corrupt data)');
  }
}
