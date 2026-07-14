/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import Login from './components/Login';
import Registration from './components/Registration';
import KeyRestoration from './components/KeyRestoration';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { ShieldAlert, Loader2 } from 'lucide-react';

function AppContent() {
  const { user, profile, loading, needsKeyGeneration, activeChat } = useChat();

  // 1. Loading state (establishing secure connection)
  if (loading) {
    return (
      <div id="loading-screen" className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
          <h2 className="text-slate-200 text-base font-bold tracking-tight">SecureMessenger</h2>
          <p className="text-slate-500 text-xxs mt-1 font-medium">Initializing cryptographic secure workspace...</p>
        </div>
      </div>
    );
  }

  // 2. Authentication Gateway
  if (!user) {
    return <Login />;
  }

  // 3. User Identity Registration
  if (!profile) {
    return <Registration />;
  }

  // 4. Client-side Key Pair Restoration
  if (needsKeyGeneration) {
    return <KeyRestoration />;
  }

  // 5. Active E2EE Messenger Workspace (Responsive Sidebar + ChatArea)
  return (
    <div id="messenger-layout" className="flex h-screen w-screen overflow-hidden bg-[#0f1115] text-[#e2e8f0] antialiased selection:bg-emerald-500/20 select-none">
      {/* Sidebar view */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex w-full'} md:w-80 h-full flex-shrink-0`}>
        <Sidebar />
      </div>

      {/* Chat Conversation view */}
      <div className={`${activeChat ? 'flex w-full' : 'hidden md:flex'} flex-1 h-full`}>
        <ChatArea />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}

