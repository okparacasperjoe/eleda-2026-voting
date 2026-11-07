'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Award,
  Crown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Vote,
  Share2,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ElectionResults } from '@/types/election';

export default function WinnersPage() {
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch('/api/election/results');
        const data = await res.json();
        setResults(data);

        // Fire celebratory confetti on page load
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#D4AF37', '#F3C623', '#0A1128', '#1E3E62', '#10B981'],
        });
      } catch (err) {
        console.error('Failed to load winners data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, []);

  const triggerMoreConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#F3C623', '#0A1128', '#1E3E62'],
    });
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Reconciling Certified Winners...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
        {/* Ceremonial Header */}
        <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-inner">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F3C623]" />
            <span>Official Election Certification</span>
          </div>

          <h1 className="text-2xl sm:text-5xl font-black text-[#0B192C] tracking-tight">
            ELEDA 2026 WINNER ANNOUNCEMENT
          </h1>

          <p className="text-xs sm:text-base text-slate-600 leading-relaxed px-2">
            By authorization of the ELEDA Independent Electoral Committee, the certified election results and declared winners for the 2026 Executive Council are published below.
          </p>

          <button
            onClick={triggerMoreConfetti}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#0A1128] text-[#F3C623] hover:bg-[#1E3E62] transition-colors shadow-lg active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Celebrate Winners
          </button>
        </div>

        {/* Position-by-Position Winner Spotlights */}
        <div className="space-y-8 sm:space-y-12">
          {results?.positions.map((pos, idx) => {
            const hasTie = pos.isTie;
            const winner = pos.winner;
            const runnersUp = pos.candidates.filter(c => !c.isWinner);

            return (
              <div
                key={pos.positionId}
                className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-[#D4AF37]/30 overflow-hidden relative"
              >
                {/* Decorative gold banner strip */}
                <div className="h-2.5 sm:h-3 bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#B8860B]"></div>

                <div className="p-4 sm:p-10 space-y-6 sm:space-y-8">
                  {/* Position Title & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 sm:pb-6 border-b border-slate-100 gap-2.5 sm:gap-3">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 sm:px-3 py-1 rounded-full">
                        Executive Office #{idx + 1}
                      </span>
                      <h2 className="text-xl sm:text-3xl font-black text-[#0B192C] mt-1.5 sm:mt-2">
                        {pos.positionTitle}
                      </h2>
                    </div>

                    {hasTie ? (
                      <div className="bg-amber-50 text-amber-800 border border-amber-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-2 text-xs font-bold self-start sm:self-auto">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>TIE DETECTED - REFER TO BYLAWS</span>
                      </div>
                    ) : winner ? (
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm self-start sm:self-auto">
                        <Crown className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>DECLARED WINNER CERTIFIED</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 font-semibold self-start sm:self-auto">
                        Awaiting Certified Resolution
                      </div>
                    )}
                  </div>

                  {/* Main Winner Showcase or Tie Notification */}
                  {hasTie ? (
                    <div className="bg-amber-50 rounded-2xl p-4 sm:p-6 border border-amber-200 text-amber-900 space-y-3">
                      <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        Deadlock Tie Encountered Between Leading Candidates
                      </h3>
                      <p className="text-xs leading-relaxed text-amber-800">
                        In accordance with Prompt Section 9, ties cannot be silently resolved by the automated engine. The Electoral Committee has flagged this position for constitutional runoff provisions or council review.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2">
                        {pos.candidates.slice(0, 2).map(c => (
                          <div key={c.candidateId} className="bg-white p-3.5 sm:p-4 rounded-xl border border-amber-200">
                            <p className="font-black text-sm text-[#0B192C]">#{c.candidateNumber} {c.fullName}</p>
                            <p className="text-xs font-bold text-amber-700 mt-1">{c.voteCount} votes ({c.percentage}%)</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : winner ? (
                    <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-center bg-gradient-to-br from-amber-50/40 via-white to-slate-50 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#D4AF37]/40 shadow-inner">
                      {/* Winner Photo with Laurel Wreath Badge */}
                      <div className="relative shrink-0">
                        <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-3 sm:border-4 border-[#D4AF37] shadow-2xl bg-slate-200">
                          <img
                            src={winner.photoUrl}
                            alt={winner.fullName}
                            className="w-full h-full object-cover object-top"
                            onError={(e: any) => {
                              e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
                            }}
                          />
                        </div>
                        <div className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#D4AF37] text-[#0A1128] flex items-center justify-center shadow-lg border-2 border-white">
                          <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      </div>

                      {/* Winner Info & Final Tallies */}
                      <div className="flex-1 text-center lg:text-left space-y-2.5 sm:space-y-3 w-full">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Elected Official</span>
                        </div>

                        <h3 className="text-xl sm:text-3xl font-black text-[#0B192C]">
                          #{winner.candidateNumber} {winner.fullName}
                        </h3>

                        {/* Metric Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-1 sm:pt-2">
                          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Total Votes</span>
                            <span className="text-lg sm:text-xl font-black text-[#0B192C]">{winner.voteCount}</span>
                          </div>

                          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Vote Share</span>
                            <span className="text-lg sm:text-xl font-black text-[#D4AF37]">{winner.percentage}%</span>
                          </div>

                          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">Office Status</span>
                            <span className="text-xs font-bold text-emerald-600 block mt-0.5 sm:mt-1">Confirmed Winner</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Voting tally pending reconciliation.
                    </div>
                  )}

                  {/* Other Candidates & Scores Table */}
                  {runnersUp.length > 0 && (
                    <div className="space-y-2.5 sm:space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Other Contesting Candidates &amp; Final Scores:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {runnersUp.map(c => (
                          <div
                            key={c.candidateId}
                            className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                #{c.candidateNumber}
                              </span>
                              <span className="font-bold text-[#0B192C] truncate">{c.fullName}</span>
                            </div>
                            <div className="text-right shrink-0 pl-2">
                              <span className="font-black text-[#0B192C]">{c.voteCount} votes</span>
                              <span className="block text-[10px] sm:text-[11px] text-slate-500">{c.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="text-center pt-8 border-t border-slate-200">
          <Link
            href="/results"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors"
          >
            Review Complete Turnout & Results Breakdown
            <ArrowRight className="w-4 h-4 text-[#F3C623]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
