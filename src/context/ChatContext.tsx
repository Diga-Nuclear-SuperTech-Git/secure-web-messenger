/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  getUserProfile,
  createUserProfile,
  subscribeToUserChats,
  subscribeToMessages,
  markMessagesAsRead,
  updateUserPresence,
} from '../lib/db';
import {
  generateE2EKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPrivateKey,
  decryptMessage,
} from '../lib/crypto';
import { getPrivateKey, savePrivateKey, deletePrivateKey } from '../lib/keyStore';
import { type UserProfile, type ChatSession, type EncryptedMessage, type DecryptedMessage } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ChatContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  privateKey: CryptoKey | null;
  loading: boolean;
  chats: ChatSession[];
  activeChat: ChatSession | null;
  activeChatPartner: UserProfile | null;
  messages: DecryptedMessage[];
  decryptionErrors: Record<string, boolean>;
  needsKeyGeneration: boolean;
  
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  registerProfile: (username: string, displayName: string, photoURL: string) => Promise<void>;
  generateNewKeyPairForExistingUser: () => Promise<void>;
  selectChat: (chat: ChatSession | null, partner: UserProfile | null) => void;
  setProfile: (profile: UserProfile | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [activeChatPartner, setActiveChatPartner] = useState<UserProfile | null>(null);
  const [encryptedMessages, setEncryptedMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [decryptionErrors, setDecryptionErrors] = useState<Record<string, boolean>>({});
  
  const [needsKeyGeneration, setNeedsKeyGeneration] = useState<boolean>(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // User logged in, check profile
        const userProf = await getUserProfile(firebaseUser.uid);
        if (userProf) {
          setProfile(userProf);
          
          // User has profile, let's load private key
          const savedKeyB64 = await getPrivateKey(firebaseUser.uid);
          if (savedKeyB64) {
            try {
              const key = await importPrivateKey(savedKeyB64);
              setPrivateKey(key);
              setNeedsKeyGeneration(false);
              // Set presence to online
              await updateUserPresence(firebaseUser.uid, 'online');
            } catch (err) {
              console.error('Failed to import saved private key:', err);
              setNeedsKeyGeneration(true);
            }
          } else {
            // Logged in from a new device, needs to rotate/generate keys
            setNeedsKeyGeneration(true);
          }
        } else {
          // No profile, needs registration
          setProfile(null);
          setPrivateKey(null);
          setNeedsKeyGeneration(false);
        }
      } else {
        // Logged out
        if (profile) {
          await updateUserPresence(profile.uid, 'offline');
        }
        setProfile(null);
        setPrivateKey(null);
        setChats([]);
        setActiveChat(null);
        setActiveChatPartner(null);
        setEncryptedMessages([]);
        setDecryptedCache({});
        setDecryptionErrors({});
        setNeedsKeyGeneration(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Presence tracker (mark offline on page close)
  useEffect(() => {
    if (!profile) return;

    const handleBeforeUnload = () => {
      // Best-effort presence update on window close
      updateUserPresence(profile.uid, 'offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [profile?.uid]);

  // 2. Subscribe to Active Chat List
  useEffect(() => {
    if (!profile) return;

    const unsubscribe = subscribeToUserChats(profile.uid, (updatedChats) => {
      setChats(updatedChats);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  // 3. Subscribe to Active Chat Messages
  useEffect(() => {
    if (!activeChat) {
      setEncryptedMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(activeChat.id, (msgs) => {
      setEncryptedMessages(msgs);
      
      // Auto-mark as read
      if (profile) {
        markMessagesAsRead(activeChat.id, profile.uid);
      }
    });

    return () => unsubscribe();
  }, [activeChat?.id, profile?.uid]);

  // 4. Asynchronous decryption scheduler (avoids blocking main thread)
  useEffect(() => {
    if (!privateKey || encryptedMessages.length === 0) return;

    let mounted = true;

    const decryptPendingMessages = async () => {
      for (const msg of encryptedMessages) {
        // Skip if already in cache or has failed
        if (decryptedCache[msg.id] || decryptionErrors[msg.id]) continue;

        try {
          // Select correct encrypted symmetric key
          const encryptedKey = msg.senderId === profile?.uid ? msg.keyForSender : msg.keyForRecipient;
          
          const plainText = await decryptMessage(
            msg.encryptedText,
            msg.iv,
            encryptedKey,
            privateKey
          );

          if (mounted) {
            setDecryptedCache((prev) => ({
              ...prev,
              [msg.id]: plainText,
            }));
          }
        } catch (err) {
          console.error(`Error decrypting message ${msg.id}:`, err);
          if (mounted) {
            setDecryptionErrors((prev) => ({
              ...prev,
              [msg.id]: true,
            }));
          }
        }
      }
    };

    decryptPendingMessages();

    return () => {
      mounted = false;
    };
  }, [encryptedMessages, privateKey, decryptedCache, decryptionErrors, profile?.uid]);

  // 5. Actions
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (profile) {
        await updateUserPresence(profile.uid, 'offline');
      }
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerProfile = async (username: string, displayName: string, photoURL: string) => {
    if (!user) throw new Error('Must be authenticated with Firebase to register a profile.');

    setLoading(true);
    try {
      // 1. Generate new RSA key pair
      const keys = await generateE2EKeyPair();
      
      // 2. Export keys
      const publicKeyB64 = await exportPublicKey(keys.publicKey);
      const privateKeyB64 = await exportPrivateKey(keys.privateKey);

      // 3. Save Private Key to IndexedDB locally
      await savePrivateKey(user.uid, privateKeyB64);

      // 4. Save Public Profile to Firestore atomically (checks username availability inside)
      const userProf = await createUserProfile(
        user.uid,
        username,
        user.email || '',
        displayName,
        photoURL,
        publicKeyB64
      );

      setPrivateKey(keys.privateKey);
      setProfile(userProf);
      setNeedsKeyGeneration(false);
    } catch (error) {
      console.error('Profile registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateNewKeyPairForExistingUser = async () => {
    if (!user || !profile) throw new Error('No user profile to rotate keys for.');

    setLoading(true);
    try {
      // Rotate keys (WhatsApp-like key registration on new device)
      const keys = await generateE2EKeyPair();
      const publicKeyB64 = await exportPublicKey(keys.publicKey);
      const privateKeyB64 = await exportPrivateKey(keys.privateKey);

      // Save Private Key locally
      await savePrivateKey(user.uid, privateKeyB64);

      // Update Public Key in Firestore
      const userRef = doc(db, 'users', user.uid);
      const batch = [];
      await setDoc(userRef, { publicKey: publicKeyB64 }, { merge: true });

      // Update local state
      setPrivateKey(keys.privateKey);
      setProfile((prev) => prev ? { ...prev, publicKey: publicKeyB64 } : null);
      setNeedsKeyGeneration(false);
      
      // Clear cache as old keys are replaced
      setDecryptedCache({});
      setDecryptionErrors({});
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const selectChat = (chat: ChatSession | null, partner: UserProfile | null) => {
    setActiveChat(chat);
    setActiveChatPartner(partner);
    setEncryptedMessages([]);
  };

  // Compile full list of DecryptedMessages for UI rendering
  const messages: DecryptedMessage[] = encryptedMessages.map((msg) => {
    const isError = decryptionErrors[msg.id];
    const decryptedText = decryptedCache[msg.id];

    return {
      ...msg,
      text: isError
        ? '🔒 Message could not be decrypted (Key changed/mismatched)'
        : decryptedText || 'Decrypting...',
      isDecryptionFailed: isError,
    };
  });

  return (
    <ChatContext.Provider
      value={{
        user,
        profile,
        privateKey,
        loading,
        chats,
        activeChat,
        activeChatPartner,
        messages,
        decryptionErrors,
        needsKeyGeneration,
        loginWithGoogle,
        logout,
        registerProfile,
        generateNewKeyPairForExistingUser,
        selectChat,
        setProfile,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
