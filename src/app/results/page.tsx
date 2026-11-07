'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Vote,
  TrendingUp,
  RefreshCw,
  Lock,
  Trophy,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ElectionResults } from '@/types/election';

const GOLD_PALETTE = ['#D4AF37', '#1E3E62', '#2D507A', '#F3C623', '#0B192C'];

export default function ResultsPage() {
  const [results, setResults] = useState<ElectionResults & { isAdminViewer?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  const fetchResults = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/election/results');
      const data = await res.json();
      setResults(data);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch election results', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchResults, 8000); // Poll every 8 seconds for live updates
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Aggregating Certified Tallies...
        </p>
      </div>
    );
  }

  const isScoresHidden = !results?.canViewCandidateScores && !results?.isAdminViewer;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#0A1128] via-[#0B192C] to-[#1E3E62] rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#F3C623]">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Live Election Statistics Arena</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black">
                Election Results & Turnout
              </h1>
              <p className="text-xs text-slate-300">
                Official tally reconciled from the cryptographic anonymous ballot box.
              </p>
            </div>

            {/* Controls & Badges */}
            <div className="flex flex-wrap items-center gap-3">
              {results?.isAdminViewer && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D4AF37] text-[#0A1128] shadow-md flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Admin Real-Time Audit View
                </span>
              )}

              <button
                onClick={fetchResults}
                disabled={refreshing}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  autoRefresh
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-800 text-slate-300 border-slate-600'
                }`}
              >
                {autoRefresh ? 'Live Auto-Sync: ON (8s)' : 'Live Auto-Sync: PAUSED'}
              </button>
            </div>
          </div>
        </div>

        {/* Visibility Notice if candidate scores are hidden during voting */}
        {isScoresHidden && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex items-start gap-3 shadow-sm">
            <EyeOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Candidate Vote Counts Kept Secret During Voting</h4>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                In compliance with Section 8 of the ELEDA 2026 Election Integrity Rules, candidate vote totals remain hidden while ballot submissions are underway to protect against voter bandwagon effects. Only turnout statistics are public. Final certified candidate totals and winners will be revealed immediately after the voting window closes.
              </p>
            </div>
          </div>
        )}

        {/* Turnout Overview Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold">Registered</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-[#0B192C]">
              {results?.totalRegisteredVoters || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total registered participants</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold">Verified</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-[#0B192C]">
              {results?.totalVerifiedVoters || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Accredited eligible delegates</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold">Ballots Cast</span>
              <Vote className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <p className="text-3xl font-black text-[#0B192C]">
              {results?.totalBallotsCast || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Anonymous ballots in ledger</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold">Turnout</span>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-black text-[#0B192C]">
              {results?.turnoutPercentage || 0}%
            </p>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#D4AF37] to-[#F3C623] h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, results?.turnoutPercentage || 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Position-by-Position Detailed Results */}
        <div className="space-y-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#0B192C]">Position-by-Position Tallies</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of delegate votes by contested executive office.
              </p>
            </div>
            {(results?.status === 'RESULTS_PUBLISHED' || results?.status === 'VOTING_CLOSED') && (
              <Link
                href="/winners"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Trophy className="w-4 h-4 text-[#F3C623]" />
                View Winner Announcements
              </Link>
            )}
          </div>

          <div className="space-y-8">
            {results?.positions.map(pos => {
              // Prepare data for Recharts
              const chartData = pos.candidates.map(c => ({
                name: c.fullName.split(' ')[0] + ' ' + (c.fullName.split(' ')[1] || ''),
                votes: c.voteCount >= 0 ? c.voteCount : 0,
                percentage: c.percentage >= 0 ? c.percentage : 0,
                candidateNumber: c.candidateNumber,
              }));

              return (
                <div
                  key={pos.positionId}
                  className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                    <div>
                      <h3 className="text-xl font-black text-[#0B192C]">{pos.positionTitle}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Total Votes Cast for Office: <strong>{pos.totalVotesCast}</strong>
                        {pos.totalAbstentions > 0 && ` • Abstentions: ${pos.totalAbstentions}`}
                      </p>
                    </div>

                    {pos.isTie && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        TIE DETECTED
                      </span>
                    )}

                    {pos.winner && !isScoresHidden && (
                      <div className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                        <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                        Projected Winner: #{pos.winner.candidateNumber} {pos.winner.fullName}
                      </div>
                    )}
                  </div>

                  {/* If scores are visible: Show Chart and Progress Bars */}
                  {!isScoresHidden ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                      {/* Left: Recharts Bar Chart */}
                      <div className="h-64 w-full bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(value: any) => [`${value} votes`, 'Total']}
                              contentStyle={{ backgroundColor: '#0A1128', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                            />
                            <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={GOLD_PALETTE[index % GOLD_PALETTE.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Right: Candidate List with Percentages */}
                      <div className="space-y-4">
                        {pos.candidates.map((cand, idx) => (
                          <div
                            key={cand.candidateId}
                            className={`p-4 rounded-2xl border transition-all ${
                              cand.isWinner
                                ? 'bg-gradient-to-r from-amber-50 to-white border-[#D4AF37] shadow-md'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#0A1128] text-[#F3C623] text-xs font-black flex items-center justify-center">
                                  #{cand.candidateNumber}
                                </span>
                                <div>
                                  <h4 className="text-sm font-black text-[#0B192C]">
                                    {cand.fullName}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 truncate max-w-xs">
                                    {cand.campaignTagline}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-base font-black text-[#0B192C]">
                                  {cand.voteCount} <span className="text-xs text-slate-500 font-normal">votes</span>
                                </span>
                                <span className="block text-xs font-bold text-[#D4AF37]">
                                  {cand.percentage}%
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F3C623]"
                                style={{ width: `${Math.max(2, cand.percentage)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* When scores are hidden during voting */
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center space-y-3">
                      <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                      <h4 className="text-sm font-bold text-[#0B192C]">
                        Candidate Vote Totals are Sealed
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        In accordance with the active visibility rules, candidate vote counts for this office are hidden until the conclusion of the election.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {pos.candidates.map(c => (
                          <span key={c.candidateId} className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                            #{c.candidateNumber} {c.fullName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
