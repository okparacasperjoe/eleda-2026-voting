'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Mail,
  Phone,
  User,
  Sparkles,
  ArrowRight,
  Lock,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    voterCode: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateCode = () => {
    const randomCode = `ELEDA-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormData(prev => ({ ...prev, voterCode: randomCode }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Password and confirmation do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessData(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full">
        {/* Brand Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200">
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#0A1128] text-[#F3C623] flex items-center justify-center mx-auto shadow-md">
              <Users className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B192C]">
              Voter Registration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              Register as an eligible ELEDA 2026 voting delegate to exercise your democratic voice.
            </p>
          </div>

          {/* Success State */}
          {successData ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-[#0B192C]">
                  Registration Successful!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  {successData.message}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 font-mono">
                <p className="text-slate-500 font-sans font-bold">Voter Record Summary:</p>
                <p><span className="text-slate-400">Name:</span> {successData.user.fullName}</p>
                <p><span className="text-slate-400">Email:</span> {successData.user.email}</p>
                <p><span className="text-slate-400">Voter Code:</span> <span className="font-bold text-[#0B192C]">{successData.user.voterCode}</span></p>
                <p>
                  <span className="text-slate-400">Status:</span>{' '}
                  <span className={successData.user.approvalStatus === 'APPROVED' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                    {successData.user.approvalStatus}
                  </span>
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/dashboard"
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#D4AF37] to-[#F3C623] text-[#0A1128] hover:opacity-95 shadow-md flex items-center justify-center gap-1.5"
                >
                  Go to Voter Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/vote"
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors flex items-center justify-center"
                >
                  Enter Voting Arena
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Dr. Olumide Adeleke"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-slate-800"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="voter@eleda2026.org"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="+234 800 000 0000"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Unique Voter Registration Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Unique Voter Registration Code
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="text-[11px] font-bold text-[#D4AF37] hover:text-[#B8860B] flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-Generate Code
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    name="voterCode"
                    value={formData.voterCode}
                    onChange={handleChange}
                    required
                    placeholder="e.g. ELEDA-2026-9041"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Tip: Tip: Codes starting with <span className="font-mono font-bold text-slate-600">ELEDA-AUTO-</span> or <span className="font-mono font-bold text-slate-600">ELEDA-VIP-</span> are instantly verified!
                </p>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Min. 8 characters"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#E5B80B] text-[#0A1128] hover:opacity-95 shadow-lg transition-opacity disabled:opacity-50 mt-2"
              >
                {loading ? 'Submitting Registration...' : 'Complete Voter Registration'}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Already registered?{' '}
                  <Link href="/login" className="font-bold text-[#0B192C] hover:text-[#D4AF37] underline">
                    Log into Voter Portal
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
