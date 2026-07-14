/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  orderBy,
  limit,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { type UserProfile, type ChatSession, type EncryptedMessage } from '../types';

/**
 * Generates a deterministic chat ID for a 1-to-1 conversation
 * based on the two participants' UIDs sorted alphabetically.
 */
export function getDeterministicChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Checks if a username is globally available.
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const cleaned = username.trim().toLowerCase();
  if (cleaned.length < 3) return false;
  const docRef = doc(db, 'usernames', cleaned);
  const docSnap = await getDoc(docRef);
  return !docSnap.exists();
}

/**
 * Creates user profile and claims the unique username atomically.
 */
export async function createUserProfile(
  uid: string,
  username: string,
  email: string,
  displayName: string,
  photoURL: string,
  publicKey: string
): Promise<UserProfile> {
  const cleanedUsername = username.trim().toLowerCase();
  
  const userProfile: UserProfile = {
    uid,
    username: cleanedUsername,
    email,
    displayName: displayName || username,
    photoURL: photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanedUsername}`,
    publicKey,
    status: 'online',
    lastSeen: Date.now(),
    privacySearchable: true,
    createdAt: Date.now(),
  };

  const batch = writeBatch(db);
  
  // 1. Create the user profile
  const userRef = doc(db, 'users', uid);
  batch.set(userRef, userProfile);

  // 2. Claim the unique username
  const usernameRef = doc(db, 'usernames', cleanedUsername);
  batch.set(usernameRef, { uid });

  await batch.commit();
  return userProfile;
}

/**
 * Fetches user profile by UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

/**
 * Updates a user's presence status (online/offline).
 */
export async function updateUserPresence(uid: string, status: 'online' | 'offline'): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    status,
    lastSeen: Date.now(),
  });
}

/**
 * Updates user profile settings (displayName, photoURL, privacy).
 */
export async function updateUserProfileSettings(
  uid: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'privacySearchable'>>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, updates);
}

/**
 * Searches for users by exact username or email, obeying privacy settings.
 */
export async function searchUsers(searchTerm: string, currentUserUid: string): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  const results: UserProfile[] = [];
  const usersColl = collection(db, 'users');

  // Query 1: Search by username
  const qUsername = query(
    usersColl,
    where('username', '==', term),
    where('privacySearchable', '==', true)
  );

  // Query 2: Search by email
  const qEmail = query(
    usersColl,
    where('email', '==', term),
    where('privacySearchable', '==', true)
  );

  const [snapUsername, snapEmail] = await Promise.all([
    getDocs(qUsername),
    getDocs(qEmail),
  ]);

  const seenUids = new Set<string>();

  const processSnap = (snap: any) => {
    snap.forEach((doc: any) => {
      const data = doc.data() as UserProfile;
      if (data.uid !== currentUserUid && !seenUids.has(data.uid)) {
        seenUids.add(data.uid);
        results.push(data);
      }
    });
  };

  processSnap(snapUsername);
  processSnap(snapEmail);

  return results;
}

/**
 * Resolves or creates a 1-to-1 Chat Session.
 */
export async function getOrCreateChat(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<ChatSession> {
  const chatId = getDeterministicChatId(currentUser.uid, otherUser.uid);
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    return chatSnap.data() as ChatSession;
  }

  const newChat: ChatSession = {
    id: chatId,
    participants: [currentUser.uid, otherUser.uid],
    createdAt: Date.now(),
    typing: {
      [currentUser.uid]: false,
      [otherUser.uid]: false,
    },
  };

  await setDoc(chatRef, newChat);
  return newChat;
}

/**
 * Listens to active chats for a user in real-time.
 */
export function subscribeToUserChats(uid: string, callback: (chats: ChatSession[]) => void): Unsubscribe {
  const chatsColl = collection(db, 'chats');
  const q = query(chatsColl, where('participants', 'array-contains', uid));

  return onSnapshot(q, (snapshot) => {
    const chats: ChatSession[] = [];
    snapshot.forEach((doc) => {
      chats.push(doc.data() as ChatSession);
    });
    // Sort chats by lastMessage timestamp or createdAt desc
    chats.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.createdAt;
      const bTime = b.lastMessage?.timestamp || b.createdAt;
      return bTime - aTime;
    });
    callback(chats);
  });
}

/**
 * Updates user typing indicator in a chat.
 */
export async function updateTypingStatus(chatId: string, uid: string, isTyping: boolean): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    [`typing.${uid}`]: isTyping,
  });
}

/**
 * Sends an end-to-end encrypted message.
 */
export async function sendEncryptedMessage(
  chatId: string,
  senderId: string,
  recipientId: string,
  messageId: string,
  encryptResult: {
    encryptedText: string;
    iv: string;
    keyForSender: string;
    keyForRecipient: string;
  }
): Promise<void> {
  const timestamp = Date.now();
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  const chatRef = doc(db, 'chats', chatId);

  const messageData: EncryptedMessage = {
    id: messageId,
    chatId,
    senderId,
    recipientId,
    encryptedText: encryptResult.encryptedText,
    iv: encryptResult.iv,
    keyForSender: encryptResult.keyForSender,
    keyForRecipient: encryptResult.keyForRecipient,
    timestamp,
    status: 'sent',
  };

  const batch = writeBatch(db);
  
  // 1. Create message document
  batch.set(msgRef, messageData);

  // 2. Update chat metadata
  batch.update(chatRef, {
    lastMessage: {
      encryptedText: encryptResult.encryptedText,
      iv: encryptResult.iv,
      senderId,
      timestamp,
    },
  });

  await batch.commit();
}

/**
 * Listens to messages within a chat session.
 */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: EncryptedMessage[]) => void
): Unsubscribe {
  const msgsColl = collection(db, 'chats', chatId, 'messages');
  const q = query(msgsColl, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages: EncryptedMessage[] = [];
    snapshot.forEach((doc) => {
      messages.push(doc.data() as EncryptedMessage);
    });
    callback(messages);
  });
}

/**
 * Marks unread messages in a chat as read.
 */
export async function markMessagesAsRead(chatId: string, recipientId: string): Promise<void> {
  const msgsColl = collection(db, 'chats', chatId, 'messages');
  const q = query(
    msgsColl,
    where('recipientId', '==', recipientId),
    where('status', 'in', ['sent', 'delivered'])
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.forEach((msgDoc) => {
    batch.update(msgDoc.ref, {
      status: 'read',
      readAt: Date.now(),
    });
  });

  await batch.commit();
}
