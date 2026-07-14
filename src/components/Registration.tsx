/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { checkUsernameAvailable } from '../lib/db';
import { ShieldAlert, CheckCircle, XCircle, KeyRound, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Registration() {
  const { registerProfile, logout } = useChat();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepStatus, setStepStatus] = useState<'idle' | 'checking' | 'keys' | 'saving'>('idle');

  // Sync avatar seed with username if not custom entered
  useEffect(() => {
    if (username && !avatarSeed) {
      setAvatarSeed(username);
    }
  }, [username]);

  // Debounce username lookup
  useEffect(() => {
    if (!username) {
      setIsAvailable(null);
      setUsernameError('');
      return;
    }

    const regex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!regex.test(username)) {
      setIsAvailable(false);
      setUsernameError('Must be 3-30 chars, alphanumeric or underscores only.');
      return;
    }

    setIsChecking(true);
    setUsernameError('');
    
    const delayDebounceFn = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(username);
        setIsAvailable(available);
        if (!available) {
          setUsernameError('Username is already claimed by another user.');
        }
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setIsChecking(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable || !username || usernameError) return;

    setIsSubmitting(true);
    
    try {
      setStepStatus('checking');
      // Double check availability
      const finalCheck = await checkUsernameAvailable(username);
      if (!finalCheck) {
        setIsAvailable(false);
        setUsernameError('Username was claimed. Please select a different one.');
        setIsSubmitting(false);
        return;
      }

      setStepStatus('keys');
      // Takes ~1-2s: generates RSA key pair and writes to IndexedDB & Firestore
      await registerProfile(
        username,
        displayName || username,
        `https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed || username}`
      );
    } catch (err) {
      console.error('Registration failed:', err);
      setIsSubmitting(false);
    }
  };

  const currentAvatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed || 'secure'}`;

  return (
    <div id="registration-screen" className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-[#1a1d23] border border-[#2d333b] p-8 rounded-3xl shadow-2xl relative"
      >
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
            <KeyRound size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Setup Security Credentials</h2>
          <p className="text-slate-400 text-sm mt-1">
            Pick a username. We will generate your end-to-end cryptographic key pair.
          </p>
        </div>

        {isSubmitting ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-6" />
            <h3 className="text-lg font-bold text-slate-200">Generating Key Pair</h3>
            
            <div className="mt-6 space-y-3 max-w-xs text-left text-sm">
              <div className="flex items-center gap-3">
                <span className={stepStatus === 'checking' ? 'text-emerald-400 animate-pulse font-medium' : 'text-slate-500'}>
                  1. Checking handle uniqueness...
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={stepStatus === 'keys' ? 'text-emerald-400 animate-pulse font-medium' : 'text-slate-500'}>
                  2. Generating 2048-bit RSA keys...
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  3. Securing Private Key locally...
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  4. Uploading Profile to Cloud...
                </span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Selection */}
            <div className="flex flex-col sm:flex-row items-center gap-5 bg-[#0f1115]/50 p-5 rounded-2xl border border-[#2d333b]">
              <div className="w-20 h-20 rounded-full border-2 border-emerald-500 bg-[#0f1115] p-1 flex-shrink-0">
                <img
                  src={currentAvatarUrl}
                  alt="Avatar Preview"
                  className="w-full h-full rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="w-full">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Avatar Customizer
                </label>
                <input
                  type="text"
                  id="input-avatar-seed"
                  placeholder="Enter seed to randomize avatar..."
                  value={avatarSeed}
                  onChange={(e) => setAvatarSeed(e.target.value)}
                  className="w-full bg-[#0f1115] border border-[#2d333b] text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* Display Name Input */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Display Name (Public Name)
              </label>
              <input
                type="text"
                id="input-display-name"
                required
                placeholder="e.g. Alice Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#0f1115] border border-[#2d333b] text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Username Handles Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Unique Username Handle
                </label>
                {isChecking && <span className="text-emerald-400 text-xs flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...</span>}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                <input
                  type="text"
                  id="input-username"
                  required
                  placeholder="alice_secure"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="w-full bg-[#0f1115] border border-[#2d333b] text-slate-100 rounded-xl pl-8 pr-12 py-3 text-sm focus:outline-none focus:border-emerald-500/50"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isAvailable === true && <CheckCircle size={18} className="text-emerald-400" />}
                  {isAvailable === false && <XCircle size={18} className="text-red-500" />}
                </div>
              </div>
              {usernameError && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                  <ShieldAlert size={14} /> {usernameError}
                </p>
              )}
            </div>

            {/* E2EE Explanation Banner */}
            <div className="bg-emerald-950/20 border border-[#2d333b]/80 p-4 rounded-xl text-xs text-emerald-400">
              <p className="leading-relaxed">
                <strong>🔒 Senior Dev Tip:</strong> Creating your profile initiates local Generation of 2048-bit RSA keys. Your private key stays on this browser. It is never transmitted. Only your public key is shared to allow others to encrypt messages for you.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                id="btn-register-cancel"
                onClick={logout}
                className="w-1/2 border border-[#2d333b] hover:bg-[#242930] text-slate-300 font-bold py-3 px-6 rounded-2xl text-center transition-colors cursor-pointer"
              >
                Sign Out
              </button>
              <button
                type="submit"
                id="btn-register-submit"
                disabled={!isAvailable || isChecking || isSubmitting}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#0f1115] disabled:text-slate-600 text-white font-bold py-3 px-6 rounded-2xl text-center shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed border border-emerald-500/10"
              >
                Generate & Join
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
