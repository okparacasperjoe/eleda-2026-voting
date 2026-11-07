'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Award,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Helper to fill demo credentials with 1 click
  const fillDemo = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-[85vh] bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200">
          <div className="text-center space-y-2 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#0A1128] text-[#F3C623] flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B192C]">
              Voter & Admin Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Access your personalized election dashboard and secure voting booth.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address or Voter Registration Code
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  placeholder="voter@eleda2026.org or ELEDA-2026-XXXX"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-slate-800"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter your account password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#E5B80B] text-[#0A1128] hover:opacity-95 shadow-lg transition-opacity disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Arena'}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Not yet registered?{' '}
                <Link href="/register" className="font-bold text-[#0B192C] hover:text-[#D4AF37] underline">
                  Register as a Voter
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* 1-Click Fast Persona Fillers for Evaluation */}
        <div className="bg-[#0B192C] p-5 rounded-2xl border border-[#1E3E62] text-white space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F3C623] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              1-Click Fast Credentials
            </h4>
            <span className="text-[10px] text-slate-400">Click to autofill</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo('voter1@eleda2026.org', 'VoterPassword2026!')}
              className="p-2.5 rounded-lg bg-[#1E3E62]/60 hover:bg-[#1E3E62] text-left border border-slate-700 transition-colors"
            >
              <p className="font-bold text-emerald-400">Voter 1 (Eligible)</p>
              <p className="text-[10px] text-slate-300">Adebayo Samuel</p>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('voter2@eleda2026.org', 'VoterPassword2026!')}
              className="p-2.5 rounded-lg bg-[#1E3E62]/60 hover:bg-[#1E3E62] text-left border border-slate-700 transition-colors"
            >
              <p className="font-bold text-blue-400">Voter 2 (Has Voted)</p>
              <p className="text-[10px] text-slate-300">Ngozi Beatrice</p>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('voter3@eleda2026.org', 'VoterPassword2026!')}
              className="p-2.5 rounded-lg bg-[#1E3E62]/60 hover:bg-[#1E3E62] text-left border border-slate-700 transition-colors"
            >
              <p className="font-bold text-amber-400">Voter 3 (Pending)</p>
              <p className="text-[10px] text-slate-300">Ibrahim Danladi</p>
            </button>

            <button
              type="button"
              onClick={() => fillDemo('admin@eleda2026.org', 'AdminPassword2026!')}
              className="p-2.5 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-left border border-[#D4AF37]/40 transition-colors"
            >
              <p className="font-bold text-[#F3C623]">Admin Officer</p>
              <p className="text-[10px] text-slate-300">Electoral Comm.</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
