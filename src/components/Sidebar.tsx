/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { searchUsers, getOrCreateChat } from '../lib/db';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type ChatSession, type UserProfile } from '../types';
import {
  Search,
  MessageSquarePlus,
  Settings,
  LogOut,
  ChevronLeft,
  Lock,
  UserCheck,
  UserX,
  Loader2,
  LockKeyhole,
} from 'lucide-react';
import SettingsModal from './SettingsModal';

export default function Sidebar() {
  const { profile, chats, activeChat, selectChat, logout } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchingNew, setIsSearchingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Handle DB Search
  useEffect(() => {
    if (!searchQuery || !profile) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearchingDb(true);
      try {
        const users = await searchUsers(searchQuery, profile.uid);
        setSearchResults(users);
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setIsSearchingDb(false);
      }
    };

    const delayDebounce = setTimeout(performSearch, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, profile?.uid]);

  const handleStartChat = async (targetUser: UserProfile) => {
    if (!profile) return;
    try {
      const chat = await getOrCreateChat(profile, targetUser);
      selectChat(chat, targetUser);
      setIsSearchingNew(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  // Filter current chats list locally
  const filteredChats = chats.filter((chat) => {
    // We don't have the user object in parent chats easily, so we can filter by participant names if we cache them
    // For a cleaner approach, search matches any local cache or matches any participant IDs.
    return true; // We can filter by profile names inside individual rows or we keep it simple.
  });

  return (
    <div id="sidebar-container" className="w-full md:w-80 h-full flex flex-col bg-[#1a1d23] border-r border-[#2d333b]">
      {/* 1. Header */}
      <div className="p-4 bg-[#1a1d23] border-b border-[#2d333b] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-500 p-[2px]">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1a1d23]">
              <img
                src={profile?.photoURL}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div>
            <h4 className="text-slate-200 text-sm font-semibold leading-none">{profile?.displayName}</h4>
            <span className="text-emerald-400 text-[10px] font-mono tracking-tight">@{profile?.username}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsSearchingNew(true)}
            title="New Chat"
            className="text-slate-400 hover:text-emerald-400 hover:bg-[#2d333b] p-2 rounded-xl transition-all cursor-pointer"
          >
            <MessageSquarePlus size={18} />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            className="text-slate-400 hover:text-emerald-400 hover:bg-[#2d333b] p-2 rounded-xl transition-all cursor-pointer"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={logout}
            title="Sign Out"
            className="text-slate-400 hover:text-red-400 hover:bg-[#2d333b] p-2 rounded-xl transition-all cursor-pointer"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* 2. Main Content Body (Normal Chats or Search View) */}
      <div className="flex-1 overflow-y-auto relative">
        {isSearchingNew ? (
          /* Search New User panel */
          <div className="absolute inset-0 z-20 bg-[#0f1115] flex flex-col">
            <div className="p-4 bg-[#1a1d23] border-b border-[#2d333b] flex items-center gap-3">
              <button
                onClick={() => setIsSearchingNew(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <ChevronLeft size={20} />
              </button>
              <h4 className="text-slate-200 text-sm font-bold">New Chat</h4>
            </div>

            <div className="p-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  id="input-db-search"
                  placeholder="Enter username or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[#2d333b] text-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-2">
              {isSearchingDb ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => handleStartChat(user)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#0f1115] border border-[#2d333b] hover:bg-[#242930] cursor-pointer text-left transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full border border-emerald-500/30 overflow-hidden bg-[#0f1115] flex-shrink-0">
                      <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-slate-200 text-xs font-bold truncate">{user.displayName}</h5>
                      <p className="text-slate-500 text-xxs truncate">@{user.username}</p>
                    </div>
                  </button>
                ))
              ) : searchQuery ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <UserX className="mx-auto mb-2 opacity-40" size={32} />
                  No searchable users found.
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xxs leading-relaxed">
                  <LockKeyhole className="mx-auto mb-2 text-emerald-500/40" size={32} />
                  Find registered friends securely.<br />Only users with <strong>Discovery enabled</strong> appear in public searches.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal Chats List */
          <div className="h-full flex flex-col">
            {/* Simple Chat Filter input */}
            <div className="p-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter chat sessions..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[#2d333b] text-slate-200 rounded-xl pl-8 pr-4 py-1.5 text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {filteredChats.length > 0 ? (
                filteredChats.map((chat) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    isActive={activeChat?.id === chat.id}
                    onSelect={(partner) => selectChat(chat, partner)}
                    filterQuery={filterQuery}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-slate-600 text-xs">
                  No chat sessions found.<br />Click the icon above to start one!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

interface ChatRowProps {
  key?: string;
  chat: ChatSession;
  isActive: boolean;
  onSelect: (partner: UserProfile) => void;
  filterQuery: string;
}

function ChatRow({ chat, isActive, onSelect, filterQuery }: ChatRowProps) {
  const { profile } = useChat();
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);

  const otherUid = chat.participants.find((uid) => uid !== profile?.uid);

  // Subscribe to partner profile to get live avatar and presence!
  useEffect(() => {
    if (!otherUid) return;

    const docRef = doc(db, 'users', otherUid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setPartnerProfile(docSnap.data() as UserProfile);
      }
    });

    return () => unsubscribe();
  }, [otherUid]);

  if (!partnerProfile) return null;

  // Perform search query filtering on partner details
  if (
    filterQuery &&
    !partnerProfile.displayName.toLowerCase().includes(filterQuery.toLowerCase()) &&
    !partnerProfile.username.toLowerCase().includes(filterQuery.toLowerCase())
  ) {
    return null;
  }

  const isTyping = chat.typing && otherUid && chat.typing[otherUid] === true;

  return (
    <button
      onClick={() => onSelect(partnerProfile)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-left relative ${
        isActive
          ? 'bg-[#242930] border-l-2 border-emerald-500 border-t-transparent border-r-transparent border-b-transparent'
          : 'hover:bg-[#242930]/60 border border-transparent'
      }`}
    >
      {/* Avatar and Presence Indicator */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full border border-[#2d333b] overflow-hidden bg-[#0f1115]">
          <img src={partnerProfile.photoURL} alt={partnerProfile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        {partnerProfile.status === 'online' && (
          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#1a1d23] rounded-full" />
        )}
      </div>

      {/* Row Information */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <h5 className="text-slate-200 text-xs font-semibold truncate">{partnerProfile.displayName}</h5>
          {chat.lastMessage?.timestamp && (
            <span className="text-slate-500 text-[10px] font-mono">
              {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {isTyping ? (
          <p className="text-emerald-400 text-[11px] font-medium animate-pulse">typing...</p>
        ) : (
          <div className="flex items-center gap-1 text-slate-500 text-xxs truncate">
            <Lock size={10} className="text-emerald-500/60 flex-shrink-0" />
            <span className="truncate">
              {chat.lastMessage?.senderId === profile?.uid ? 'You sent a secure message' : 'Secure message'}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
