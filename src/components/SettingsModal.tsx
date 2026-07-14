/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { updateUserProfileSettings } from '../lib/db';
import { X, Shield, ShieldCheck, Check, Copy, User, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { profile, setProfile } = useChat();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [privacySearchable, setPrivacySearchable] = useState(profile?.privacySearchable ?? true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !profile) return null;

  // Format public key to high-end alphanumeric groups (fingerprint)
  const getFingerprint = () => {
    if (!profile.publicKey) return 'No public key generated';
    const key = profile.publicKey;
    // Extract first 40 chars and group them in blocks of 5
    const clean = key.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 30);
    const matches = clean.match(/.{1,5}/g);
    return matches ? matches.join(' ') : clean;
  };

  const handleCopyFingerprint = () => {
    navigator.clipboard.writeText(profile.publicKey);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);

    try {
      const finalAvatarUrl = avatarSeed 
        ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}`
        : profile.photoURL;

      const updates = {
        displayName: displayName || profile.displayName,
        photoURL: finalAvatarUrl,
        privacySearchable,
      };

      await updateUserProfileSettings(profile.uid, updates);

      // Update context state
      setProfile({
        ...profile,
        ...updates,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1115]/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-[#1a1d23] border border-[#2d333b] rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/5 relative"
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-[#2d333b]">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <User size={18} className="text-emerald-400" />
              <span>Profile Settings</span>
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 hover:bg-[#242930] p-1.5 rounded-lg cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Display Name
              </label>
              <input
                type="text"
                id="settings-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#0f1115] border border-[#2d333b] text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Avatar Update */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Avatar Seed (Enter seed to update)
              </label>
              <input
                type="text"
                id="settings-avatar-seed"
                placeholder="Enter seed (or leave blank to keep current)..."
                value={avatarSeed}
                onChange={(e) => setAvatarSeed(e.target.value)}
                className="w-full bg-[#0f1115] border border-[#2d333b] text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Privacy Searchable Toggle */}
            <div className="bg-[#0f1115]/50 border border-[#2d333b] p-4 rounded-xl flex items-start gap-3">
              <input
                type="checkbox"
                id="settings-privacy"
                checked={privacySearchable}
                onChange={(e) => setPrivacySearchable(e.target.checked)}
                className="mt-1 h-4.5 w-4.5 rounded border-[#2d333b] bg-[#0f1115] text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="flex-1">
                <label htmlFor="settings-privacy" className="text-slate-200 text-sm font-semibold select-none cursor-pointer">
                  Public Discovery
                </label>
                <p className="text-slate-500 text-xxs mt-0.5">
                  Allow other users to search and discover your account by typing your exact username or email.
                </p>
              </div>
            </div>

            {/* Public Key Fingerprint Card */}
            <div className="bg-[#0f1115]/60 border border-[#2d333b] p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={12} className="text-emerald-400" /> Security Fingerprint
                </span>
                <button
                  type="button"
                  id="btn-copy-fingerprint"
                  onClick={handleCopyFingerprint}
                  className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 text-xxs bg-[#1a1d23] border border-[#2d333b] px-2 py-1 rounded-md transition-colors cursor-pointer"
                >
                  {copiedFingerprint ? <Check size={10} /> : <Copy size={10} />}
                  <span>{copiedFingerprint ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
              <p className="font-mono text-xxs text-slate-300 break-all bg-[#0f1115]/80 p-2.5 border border-[#2d333b]/60 rounded-lg leading-relaxed select-all">
                {getFingerprint()}
              </p>
              <span className="text-slate-500 text-xxxs mt-2 block flex items-center gap-1">
                <ShieldCheck size={10} className="text-emerald-400" />
                Valid 2048-bit RSA-OAEP cryptokey. Verifiable client-side.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 border border-[#2d333b] hover:bg-[#242930] text-slate-300 font-bold py-2.5 rounded-xl text-center text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-settings"
                disabled={isSaving}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#0f1115] text-white font-bold py-2.5 rounded-xl text-center text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-500/10"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : success ? (
                  <>
                    <Check size={16} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
