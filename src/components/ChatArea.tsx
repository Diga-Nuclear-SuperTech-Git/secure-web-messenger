/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { sendEncryptedMessage, updateTypingStatus } from '../lib/db';
import { encryptMessage } from '../lib/crypto';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type DecryptedMessage, type UserProfile } from '../types';
import {
  Send,
  ShieldCheck,
  ShieldAlert,
  Paperclip,
  Check,
  CheckCheck,
  Smartphone,
  Eye,
  EyeOff,
  Smile,
  FileText,
  Image,
  Camera,
  MapPin,
  User,
  MoreVertical,
  Lock,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ChatArea() {
  const { activeChat, activeChatPartner, messages, profile, selectChat } = useChat();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(activeChatPartner);
  const [showAttachments, setShowAttachments] = useState(false);
  const [inspectMessageId, setInspectMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync partner profile from props or Firestore subscription
  useEffect(() => {
    if (!activeChatPartner) {
      setPartnerProfile(null);
      return;
    }
    setPartnerProfile(activeChatPartner);

    const docRef = doc(db, 'users', activeChatPartner.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setPartnerProfile(docSnap.data() as UserProfile);
      }
    });

    return () => unsubscribe();
  }, [activeChatPartner?.uid]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  // Handle typing state clean up on unmount or chat change
  useEffect(() => {
    return () => {
      if (activeChat && profile) {
        updateTypingStatus(activeChat.id, profile.uid, false);
      }
    };
  }, [activeChat?.id, profile?.uid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!activeChat || !profile) return;

    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(activeChat.id, profile.uid, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(activeChat.id, profile.uid, false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeChat || !profile || !partnerProfile) return;

    setInputText('');
    
    // Clear typing indicator immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    updateTypingStatus(activeChat.id, profile.uid, false);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 1. Encrypt message payload using RSA hybrid keys
      const encryptResult = await encryptMessage(
        text,
        partnerProfile.publicKey,
        profile.publicKey
      );

      // 2. Transmit ciphertext to Firestore (atomic transaction)
      await sendEncryptedMessage(
        activeChat.id,
        profile.uid,
        partnerProfile.uid,
        messageId,
        encryptResult
      );
    } catch (err) {
      console.error('Failed to send encrypted message:', err);
    }
  };

  // Group messages by local calendar day (Today, Yesterday, Date)
  const formatGroupDay = (timestamp: number) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderMessages = () => {
    let lastDateStr = '';

    return messages.map((msg, index) => {
      const msgDateStr = formatGroupDay(msg.timestamp);
      const isNewDayGroup = msgDateStr !== lastDateStr;
      lastDateStr = msgDateStr;

      const isMe = msg.senderId === profile?.uid;
      const isInspecting = inspectMessageId === msg.id;

      return (
        <React.Fragment key={msg.id}>
          {isNewDayGroup && (
            <div className="flex justify-center my-4">
              <span className="bg-[#1a1d23] border border-[#2d333b] text-slate-400 font-semibold px-3.5 py-1 rounded-full text-xxs tracking-wide">
                {msgDateStr}
              </span>
            </div>
          )}

          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
            <div
              id={`msg-bubble-${msg.id}`}
              className={`max-w-[85%] sm:max-w-md rounded-2xl px-3.5 py-2.5 shadow-md border ${
                isMe
                  ? 'bg-emerald-600 border-emerald-500/10 text-white rounded-tr-none shadow-lg shadow-emerald-950/20'
                  : 'bg-[#1a1d23] border-[#2d333b] text-[#e2e8f0] rounded-tl-none'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <span className="text-xs break-words leading-relaxed">{msg.text}</span>
                <span className="text-slate-500 hover:text-emerald-400 cursor-pointer transition-colors p-0.5" onClick={() => setInspectMessageId(isInspecting ? null : msg.id)} title="Inspect Crypto Packet">
                  {isInspecting ? <EyeOff size={12} /> : <Eye size={12} />}
                </span>
              </div>

              {/* Timestamp & Tick Indicators */}
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <span className="text-slate-500 text-xxxs font-mono select-none">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMe && (
                  <span className="flex-shrink-0">
                    {msg.status === 'sent' && <Check size={11} className="text-slate-500" />}
                    {msg.status === 'delivered' && <CheckCheck size={11} className="text-slate-500" />}
                    {msg.status === 'read' && <CheckCheck size={11} className="text-blue-400" />}
                  </span>
                )}
              </div>

              {/* Inspect Cryptography Payload Panel */}
              <AnimatePresence>
                {isInspecting && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3.5 pt-3.5 border-t border-[#2d333b]/60 overflow-hidden"
                  >
                    <div className="bg-[#0f1115] p-3 rounded-xl border border-[#2d333b] text-left">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xxxs font-bold uppercase tracking-wider mb-2">
                        <ShieldCheck size={11} />
                        <span>Firestore Encrypted Record</span>
                      </div>
                      
                      <div className="space-y-2 font-mono text-xxxs text-slate-400">
                        <div>
                          <span className="text-slate-600 block">message_id:</span>
                          <span className="text-slate-300 select-all">{msg.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">ciphertext_payload (Base64 AES):</span>
                          <span className="text-slate-300 break-all select-all block max-h-16 overflow-y-auto">{msg.encryptedText}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">initialization_vector:</span>
                          <span className="text-slate-300 select-all">{msg.iv}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">recipient_wrapped_key (Base64 RSA-OAEP):</span>
                          <span className="text-slate-300 break-all select-all block max-h-16 overflow-y-auto">{msg.keyForRecipient}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">sender_wrapped_key (Base64 RSA-OAEP):</span>
                          <span className="text-slate-300 break-all select-all block max-h-16 overflow-y-auto">{msg.keyForSender}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  const isPartnerTyping = activeChat && partnerProfile && activeChat.typing && activeChat.typing[partnerProfile.uid] === true;

  if (!activeChat || !partnerProfile) {
    return (
      <div id="chat-fallback" className="flex-1 h-full bg-[#0f1115] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-5 border border-emerald-500/20">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-slate-100 text-lg font-bold">SecureMessenger Client</h3>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            All conversations are encrypted dynamically on-device. Your messages are protected with strong local storage private keys.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-xxs text-slate-600">
            <Lock size={12} />
            <span>End-to-End Encrypted. Built by Antigravity Core.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="active-chat-container" className="flex-1 h-full flex flex-col bg-[#0f1115] relative">
      {/* 1. Chat Header */}
      <div className="p-4 bg-[#1a1d23]/80 backdrop-blur-md border-b border-[#2d333b] flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => selectChat(null, null)}
            className="md:hidden text-slate-400 hover:text-slate-200 cursor-pointer p-1 -ml-1"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full border border-[#2d333b] overflow-hidden bg-[#0f1115]">
              <img src={partnerProfile.photoURL} alt={partnerProfile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            {partnerProfile.status === 'online' && (
              <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#1a1d23] rounded-full" />
            )}
          </div>

          <div>
            <h4 className="text-slate-200 text-sm font-bold flex items-center gap-2 leading-none">
              {partnerProfile.displayName}
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] uppercase tracking-widest font-bold border border-emerald-500/20">Verified</span>
            </h4>
            {isPartnerTyping ? (
              <span className="text-emerald-400 text-xxs font-semibold animate-pulse block mt-1">typing...</span>
            ) : partnerProfile.status === 'online' ? (
              <span className="text-emerald-400 text-xxs block mt-0.5">online</span>
            ) : (
              <span className="text-slate-500 text-xxs block mt-0.5">
                offline • Last seen {new Date(partnerProfile.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 text-gray-400">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-tighter text-gray-500">E2EE Status</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"></circle></svg>
              AES-256-GCM
            </span>
          </div>
          <button className="text-slate-400 hover:text-slate-200 p-1 rounded-md cursor-pointer">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* 2. Messages List Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[radial-gradient(#2d333b_1px,transparent_1px)] [background-size:16px_16px] bg-[#0f1115]">
        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Attachments Floating Modal */}
      <AnimatePresence>
        {showAttachments && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 left-4 z-30 bg-[#1a1d23] border border-[#2d333b] rounded-2xl p-3 grid grid-cols-3 gap-3 shadow-2xl shadow-emerald-950/10 w-60"
          >
            <button
              onClick={() => setShowAttachments(false)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#0f1115] hover:bg-[#242930] text-teal-400 transition-colors cursor-pointer"
            >
              <FileText size={20} />
              <span className="text-[10px] mt-1 text-slate-400">Document</span>
            </button>
            <button
              onClick={() => setShowAttachments(false)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#0f1115] hover:bg-[#242930] text-pink-400 transition-colors cursor-pointer"
            >
              <Image size={20} />
              <span className="text-[10px] mt-1 text-slate-400">Gallery</span>
            </button>
            <button
              onClick={() => setShowAttachments(false)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#0f1115] hover:bg-[#242930] text-amber-500 transition-colors cursor-pointer"
            >
              <Camera size={20} />
              <span className="text-[10px] mt-1 text-slate-400">Camera</span>
            </button>
            <button
              onClick={() => setShowAttachments(false)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#0f1115] hover:bg-[#242930] text-emerald-400 transition-colors cursor-pointer"
            >
              <MapPin size={20} />
              <span className="text-[10px] mt-1 text-slate-400">Location</span>
            </button>
            <button
              onClick={() => setShowAttachments(false)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#0f1115] hover:bg-[#242930] text-blue-400 transition-colors cursor-pointer"
            >
              <User size={20} />
              <span className="text-[10px] mt-1 text-slate-400">Contact</span>
            </button>
            <button
              onClick={() => setShowAttachments(false)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#0f1115] hover:bg-[#242930] text-rose-500 transition-colors cursor-pointer"
            >
              <Smartphone size={20} />
              <span className="text-[10px] mt-1 text-slate-400">Audio</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Message Input Control Bar */}
      <div className="p-4 bg-[#0f1115]">
        <form onSubmit={handleSendMessage} className="bg-[#1a1d23] border border-[#2d333b] rounded-2xl p-2 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowAttachments(!showAttachments)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                showAttachments ? 'bg-[#242930] text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-[#242930]/40'
              }`}
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#242930]/40 cursor-pointer hidden sm:block"
            >
              <Smile size={18} />
            </button>
          </div>

          <input
            type="text"
            id="input-message"
            required
            placeholder="Write an encrypted message..."
            value={inputText}
            onChange={handleInputChange}
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-100 text-sm py-2 px-2"
          />

          <button
            type="submit"
            id="btn-send-message"
            disabled={!inputText.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#0f1115] disabled:text-slate-600 text-white p-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-center mt-3 text-[9px] text-slate-600 uppercase tracking-[0.2em] font-semibold italic">Secure Tunnel Active • Project-Grade Infrastructure</p>
      </div>
    </div>
  );
}
