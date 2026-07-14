/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useChat } from '../context/ChatContext';
import { ShieldCheck, MessageSquareCode, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { loginWithGoogle, loading } = useChat();

  return (
    <div id="login-screen" className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-75" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-[#1a1d23]/70 backdrop-blur-md border border-[#2d333b] p-8 rounded-3xl shadow-2xl shadow-emerald-950/5 text-center relative z-10"
      >
        {/* App Logo / Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 blur opacity-30 animate-pulse" />
            <div className="relative bg-[#0f1115] p-5 rounded-full border border-[#2d333b] text-emerald-400">
              <MessageSquareCode size={44} className="animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title & Brand */}
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-2">
          SecureMessenger
        </h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
          WhatsApp-inspired messaging reinforced with true end-to-end cryptographic encryption.
        </p>

        {/* Features Checklist */}
        <div className="space-y-4 mb-8 text-left bg-[#0f1115]/50 p-5 rounded-2xl border border-[#2d333b]/80">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500/10 p-1 rounded-lg text-emerald-400 mt-0.5">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h4 className="text-slate-200 text-xs font-semibold">Zero-Knowledge E2EE</h4>
              <p className="text-slate-500 text-xxs mt-0.5">
                Keys are kept strictly on your device. Nobody else can read your messages.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500/10 p-1 rounded-lg text-emerald-400 mt-0.5">
              <Sparkles size={16} />
            </div>
            <div>
              <h4 className="text-slate-200 text-xs font-semibold">Real-Time Interaction</h4>
              <p className="text-slate-500 text-xxs mt-0.5">
                Instant delivery indicators, dynamic typing updates, and presence.
              </p>
            </div>
          </div>
        </div>

        {/* Sign In Button */}
        <button
          id="btn-google-signin"
          onClick={loginWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#0f1115] text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer disabled:cursor-not-allowed border border-emerald-500/10"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {/* Simple Google G SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="text-slate-600 text-xxs mt-6">
          Secured by Google Authentication & Google Cloud Firestore.
        </p>
      </motion.div>
    </div>
  );
}
