'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Shield,
  Vote,
  Trophy,
  BarChart3,
  User as UserIcon,
  LogOut,
  ChevronDown,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ElectionStatus } from '@/types/election';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [electionStatus, setElectionStatus] = useState<ElectionStatus>('VOTING_LIVE');
  const [isEmergencyPaused, setIsEmergencyPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);

  // Fetch session & election status
  const fetchState = async () => {
    try {
      const [authRes, electionRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/election'),
      ]);
      const authData = await authRes.json();
      if (authData.authenticated) {
        setCurrentUser(authData.user);
      } else {
        setCurrentUser(null);
      }

      const elecData = await electionRes.json();
      if (elecData.election) {
        setElectionStatus(elecData.election.status);
        setIsEmergencyPaused(elecData.election.isEmergencyPaused);
      }
    } catch (e) {
      console.error('Failed to sync header state', e);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 15000); // sync every 15s
    return () => clearInterval(interval);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Demo Persona Switcher (quick login helper)
  const switchPersona = async (email: string, password = 'VoterPassword2026!') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setIsPersonaOpen(false);
        if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch (e) {
      console.error('Quick switch failed', e);
    }
  };

  // Status badge color and label
  const getStatusBadge = () => {
    if (isEmergencyPaused) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-900/60 text-red-200 border border-red-500/40 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          EMERGENCY SUSPENDED
        </span>
      );
    }

    switch (electionStatus) {
      case 'VOTING_LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/50 text-emerald-300 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            VOTING LIVE
          </span>
        );
      case 'VOTING_PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-900/50 text-amber-300 border border-amber-500/40">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            VOTING PAUSED
          </span>
        );
      case 'VOTING_CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-600">
            <Lock className="w-3 h-3 text-slate-400" />
            VOTING CLOSED
          </span>
        );
      case 'RESULTS_PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gold-500/20 text-gold-300 border border-gold-500/50">
            <Trophy className="w-3 h-3 text-gold-400" />
            RESULTS PUBLISHED
          </span>
        );
      case 'ELECTION_SCHEDULED':
      case 'VOTING_OPENS_SOON':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-900/50 text-blue-300 border border-blue-500/40">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            SCHEDULED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-600">
            REGISTRATION OPEN
          </span>
        );
    }
  };

  return (
    <>
      {isEmergencyPaused && (
        <div className="bg-red-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 animate-bounce" />
          <span>NOTICE: The Electoral Committee has temporarily suspended ballot submissions for routine integrity verification.</span>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-[#0A1128] text-white border-b border-[#1E3E62] shadow-xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#F3C623] to-[#B8860B] p-0.5 shadow-lg group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-[#0A1128] rounded-[10px] flex items-center justify-center">
                <Vote className="w-6 h-6 text-[#F3C623]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-white">
                  ELEDA <span className="gold-gradient-text">2026</span>
                </span>
                {getStatusBadge()}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                DIGITAL VOTING ARENA
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-3 text-sm font-medium">
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg transition-colors ${
                pathname === '/' ? 'text-[#F3C623] bg-white/5 font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Arena
            </Link>
            <Link
              href="/vote"
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                pathname === '/vote' ? 'text-[#F3C623] bg-white/5 font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Vote className="w-4 h-4 text-[#F3C623]" />
              Vote Now
            </Link>
            <Link
              href="/#positions"
              className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Candidates
            </Link>
            <Link
              href="/results"
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                pathname === '/results' ? 'text-[#F3C623] bg-white/5 font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Live Results
            </Link>
            <Link
              href="/winners"
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                pathname === '/winners' ? 'text-[#F3C623] bg-white/5 font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy className="w-4 h-4 text-[#F3C623]" />
              Winners
            </Link>
            <Link
              href="/#audit"
              className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-4 h-4 text-blue-400" />
              Audit Ledger
            </Link>
          </nav>

          {/* Right Actions & Persona Switcher */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsPersonaOpen(!isPersonaOpen)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#1E3E62]/70 text-slate-200 hover:bg-[#1E3E62] border border-[#2D507A] transition-all"
                title="Switch demo account to test different roles"
              >
                <span className="w-2 h-2 rounded-full bg-[#F3C623]"></span>
                <span>Demo Persona</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isPersonaOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#0B192C] border border-[#1E3E62] rounded-xl shadow-2xl p-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-[#1E3E62] mb-1">
                    <p className="font-bold text-white uppercase tracking-wider text-[11px]">Select Demo Role</p>
                    <p className="text-slate-400 text-[10px]">Instant 1-click evaluation without re-typing</p>
                  </div>
                  <button
                    onClick={() => switchPersona('voter1@eleda2026.org')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1E3E62] flex items-center gap-2 text-slate-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-400 flex items-center justify-center font-bold">V1</div>
                    <div>
                      <p className="font-semibold text-white">Eligible Voter (Ready)</p>
                      <p className="text-[10px] text-slate-400">Adebayo Samuel (Not Voted)</p>
                    </div>
                  </button>
                  <button
                    onClick={() => switchPersona('voter2@eleda2026.org')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1E3E62] flex items-center gap-2 text-slate-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-400 flex items-center justify-center font-bold">V2</div>
                    <div>
                      <p className="font-semibold text-white">Voted Voter (With Receipt)</p>
                      <p className="text-[10px] text-slate-400">Ngozi Beatrice (Ballot Cast)</p>
                    </div>
                  </button>
                  <button
                    onClick={() => switchPersona('voter3@eleda2026.org')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1E3E62] flex items-center gap-2 text-slate-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-900/60 text-amber-400 flex items-center justify-center font-bold">V3</div>
                    <div>
                      <p className="font-semibold text-white">Pending Delegate</p>
                      <p className="text-[10px] text-slate-400">Ibrahim Danladi (Awaiting Approval)</p>
                    </div>
                  </button>
                  <div className="border-t border-[#1E3E62] my-1"></div>
                  <button
                    onClick={() => switchPersona('admin@eleda2026.org', 'AdminPassword2026!')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#D4AF37]/20 flex items-center gap-2 text-[#F3C623] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#0A1128] flex items-center justify-center font-bold">ADM</div>
                    <div>
                      <p className="font-semibold text-white">Chief Electoral Commissioner</p>
                      <p className="text-[10px] text-slate-300">Full Administrative Control Panel</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* User Session Info or Login/Register buttons */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {currentUser.role === 'ADMIN' ? (
                  <Link
                    href="/admin"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#D4AF37] to-[#F3C623] text-[#0A1128] hover:opacity-95 shadow-md flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Panel
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1E3E62] text-white hover:bg-[#2D507A] border border-[#2D507A] flex items-center gap-1.5"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#F3C623]" />
                    Dashboard
                  </Link>
                )}

                {electionStatus === 'VOTING_LIVE' && currentUser.role === 'VOTER' && (
                  <Link
                    href="/vote"
                    className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-95 shadow-lg shadow-emerald-900/30"
                  >
                    <Vote className="w-3.5 h-3.5" />
                    Cast Ballot
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/vote"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#E5B80B] text-[#0A1128] hover:opacity-95 shadow-lg flex items-center gap-1.5 transition-transform hover:scale-105"
                >
                  <Vote className="w-4 h-4" />
                  Vote Now
                </Link>
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 border border-slate-700 transition-colors"
                >
                  Admin / Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
