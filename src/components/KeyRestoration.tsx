/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { ShieldCheck, ShieldAlert, KeyRound, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function KeyRestoration() {
  const { generateNewKeyPairForExistingUser, logout, profile } = useChat();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateNewKeyPairForExistingUser();
    } catch (err) {
      console.error('Failed to restore keys:', err);
      setIsGenerating(false);
    }
  };

  return (
    <div id="key-restoration-screen" className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#1a1d23] border border-[#2d333b] p-8 rounded-3xl shadow-2xl relative text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-yellow-500/10 blur animate-pulse" />
            <div className="relative bg-[#0f1115] p-5 rounded-full border border-[#2d333b] text-yellow-500">
              <KeyRound size={36} className="animate-pulse" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-100 mb-2">New Device Detected</h2>
        <p className="text-slate-400 text-sm mb-6">
          Hi <span className="text-emerald-400 font-semibold">@{profile?.username}</span>, we found your account! However, your private encryption key was not found on this device.
        </p>

        {/* E2EE Info Box */}
        <div className="text-left space-y-4 bg-[#0f1115]/50 border border-[#2d333b]/80 p-5 rounded-2xl mb-8 text-xs text-slate-400">
          <div className="flex gap-3">
            <ShieldAlert size={18} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-200">Where is my key?</h4>
              <p className="mt-0.5 text-slate-500 leading-relaxed">
                Because of true end-to-end encryption (E2EE), your private key is kept strictly inside the browser cache of your other devices and is never uploaded.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-200">What happens if I generate a new key?</h4>
              <p className="mt-0.5 text-slate-500 leading-relaxed">
                You will rotate your public key in the system. This allows you to immediately start sending and receiving new encrypted messages on this device. Note that old messages cannot be decrypted.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <span className="text-sm text-slate-300">Generating cryptographic secure credentials...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              id="btn-generate-new-keys"
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all cursor-pointer border border-emerald-500/10 hover:-translate-y-0.5"
            >
              <span>Activate Device & Rotate Keys</span>
              <ArrowRight size={16} />
            </button>
            <button
              id="btn-restoration-signout"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 border border-[#2d333b] hover:bg-[#242930] text-slate-400 font-semibold py-3 px-6 rounded-2xl transition-all cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
