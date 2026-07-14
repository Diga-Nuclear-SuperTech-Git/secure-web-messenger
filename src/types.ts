/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  photoURL: string;
  publicKey: string; // Base64 encoded public key
  status: 'online' | 'offline';
  lastSeen: number; // UTC timestamp
  privacySearchable: boolean; // can other users find them?
  createdAt: number;
}

export interface ChatSession {
  id: string;
  participants: string[]; // [uid1, uid2]
  createdAt: number;
  typing?: {
    [uid: string]: boolean; // uid -> typing status
  };
  lastMessage?: {
    encryptedText: string;
    iv: string;
    senderId: string;
    timestamp: number;
    // For the list view, we will show "🔒 Encrypted Message" to prove E2EE!
  };
}

export interface EncryptedMessage {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  encryptedText: string; // Base64 encoded ciphertext
  iv: string; // Base64 encoded IV
  keyForSender: string; // Symmetric AES key encrypted with Sender's public key (Base64)
  keyForRecipient: string; // Symmetric AES key encrypted with Recipient's public key (Base64)
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  readAt?: number;
}

export interface DecryptedMessage extends Omit<EncryptedMessage, 'encryptedText'> {
  text: string; // Decrypted plain text
  isDecryptionFailed?: boolean;
}
