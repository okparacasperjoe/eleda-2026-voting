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
  AlertTriangle,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import { ElectionStatus } from '@/types/election';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [electionStatus, setElectionStatus] = useState<ElectionStatus>('VOTING_LIVE');
  const [isEmergencyPaused, setIsEmergencyPaused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
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

  // Status badge color and label
  const getStatusBadge = () => {
    if (isEmergencyPaused) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-900/60 text-red-200 border border-red-500/40 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          PAUSED
        </span>
      );
    }

    switch (electionStatus) {
      case 'VOTING_LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            VOTING LIVE
          </span>
        );
      case 'VOTING_PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/60 text-amber-200 border border-amber-500/40">
            PAUSED
          </span>
        );
      case 'VOTING_CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-600">
            VOTING CLOSED
          </span>
        );
      case 'RESULTS_PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/20 text-[#F3C623] border border-[#D4AF37]/50">
            <Trophy className="w-3 h-3 text-[#F3C623]" />
            RESULTS PUBLISHED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/50 text-blue-300 border border-blue-500/40">
            SCHEDULED
          </span>
        );
    }
  };

  return (
    <>
      {isEmergencyPaused && (
        <div className="bg-red-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 animate-bounce" />
          <span>NOTICE: Ballot submissions are temporarily suspended for routine integrity verification.</span>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-[#0A1128] text-white border-b border-[#1E3E62] shadow-xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo & Platform Name */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#F3C623] to-[#B8860B] p-0.5 shadow-lg group-hover:scale-105 transition-transform duration-200 shrink-0">
              <div className="w-full h-full bg-[#0A1128] rounded-[10px] flex items-center justify-center">
                <Vote className="w-5 h-5 sm:w-6 sm:h-6 text-[#F3C623]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-xl font-black tracking-wider text-white">
                  ELEDA <span className="gold-gradient-text">2026</span>
                </span>
                <div className="hidden sm:inline-flex">
                  {getStatusBadge()}
                </div>
              </div>
              <p className="hidden xs:block text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-400 font-medium">
                DIGITAL VOTING ARENA
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg transition-colors ${
                pathname === '/' ? 'text-[#F3C623] bg-white/5 font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </Link>
            <Link
              href="/#voting-booth"
              className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <Vote className="w-4 h-4 text-[#F3C623]" />
              Voting Booth
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

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                {currentUser.role === 'ADMIN' ? (
                  <Link
                    href="/admin"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#D4AF37] to-[#F3C623] text-[#0A1128] hover:opacity-95 shadow-md flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Panel
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1E3E62] text-white hover:bg-[#2D507A] border border-[#2D507A] flex items-center gap-1.5"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#F3C623]" />
                    Dashboard
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/#voting-booth"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#E5B80B] text-[#0A1128] hover:opacity-95 shadow-lg flex items-center gap-1.5 transition-transform hover:scale-105"
                >
                  <Vote className="w-4 h-4" />
                  Vote Now
                </Link>
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-slate-700/80 transition-colors flex items-center gap-1"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Admin
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions & Hamburger Toggle Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden">
            {/* Mobile compact status pill */}
            <div className="sm:hidden">
              {electionStatus === 'VOTING_LIVE' && !isEmergencyPaused ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE
                </span>
              ) : isEmergencyPaused ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-900/60 text-red-200 border border-red-500/40">
                  PAUSED
                </span>
              ) : null}
            </div>

            <Link
              href="/#voting-booth"
              className="px-2.5 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-[#D4AF37] to-[#F3C623] text-[#0A1128] shadow-sm flex items-center gap-1"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Vote</span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-[#F3C623]" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#070F2B] border-t border-[#1E3E62] px-4 pt-3 pb-6 space-y-2 animate-fade-in shadow-2xl">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                pathname === '/' ? 'text-[#F3C623] bg-white/10' : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              Home Arena
            </Link>
            <Link
              href="/#voting-booth"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-[#F3C623] bg-[#D4AF37]/10 border border-[#D4AF37]/30"
            >
              <Vote className="w-4 h-4" />
              Vote Now (No Registration)
            </Link>
            <Link
              href="/results"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                pathname === '/results' ? 'text-[#F3C623] bg-white/10' : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Live Election Results
            </Link>
            <Link
              href="/winners"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                pathname === '/winners' ? 'text-[#F3C623] bg-white/10' : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <Trophy className="w-4 h-4 text-[#F3C623]" />
              Winner Announcements
            </Link>
            <Link
              href="/#audit"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              <Shield className="w-4 h-4 text-blue-400" />
              Audit Ledger &amp; Receipt Verifier
            </Link>

            <div className="pt-3 border-t border-[#1E3E62] flex items-center justify-between">
              {currentUser ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-slate-300">
                    Logged in as <strong>{currentUser.fullName}</strong>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-red-400 font-bold px-3 py-1.5 rounded-lg hover:bg-red-900/30"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Admin Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
