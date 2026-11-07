'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Vote,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
  Lock,
  ArrowRight,
  ExternalLink,
  Award,
  ChevronRight,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';
import CandidateModal from '@/components/CandidateModal';
import { Candidate, ElectionPosition, Election } from '@/types/election';

export default function VoterDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<(ElectionPosition & { candidates: Candidate[] })[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedPositionTitle, setSelectedPositionTitle] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [authRes, elecRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/election'),
        ]);

        const authData = await authRes.json();
        if (!authData.authenticated) {
          router.push('/login');
          return;
        }

        setUser(authData.user);
        setEligibility(authData.eligibility);

        const elecData = await elecRes.json();
        if (elecData.election) {
          setElection(elecData.election);
          setPositions(elecData.positions || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [router]);

  const copyReceipt = () => {
    if (!eligibility?.receiptCode) return;
    navigator.clipboard.writeText(eligibility.receiptCode);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const openCandidateModal = (cand: Candidate, posTitle: string) => {
    setSelectedCandidate(cand);
    setSelectedPositionTitle(posTitle);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Voter Dashboard...</p>
        </div>
      </div>
    );
  }

  const isEligibleToVote =
    user?.approvalStatus === 'APPROVED' &&
    election?.status === 'VOTING_LIVE' &&
    !eligibility?.hasVoted;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Voter Greeting & Status Header */}
        <div className="bg-gradient-to-r from-[#0A1128] via-[#0B192C] to-[#1E3E62] rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#F3C623]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ELEDA 2026 Verified Delegate</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black">
                Welcome, {user?.fullName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
                <span>Code: <strong className="text-white">{user?.voterCode}</strong></span>
                <span>•</span>
                <span>Email: <strong className="text-white">{user?.email}</strong></span>
              </div>
            </div>

            {/* Approval / Verification Badge */}
            <div className="self-start md:self-auto">
              {user?.approvalStatus === 'APPROVED' ? (
                <div className="bg-emerald-950/60 border border-emerald-500/50 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Registration Approved</p>
                    <p className="text-[11px] text-emerald-200/70">Eligible to cast ballot</p>
                  </div>
                </div>
              ) : user?.approvalStatus === 'PENDING' ? (
                <div className="bg-amber-950/60 border border-amber-500/50 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-amber-300">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Pending Verification</p>
                    <p className="text-[11px] text-amber-200/70">Awaiting electoral committee review</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-950/60 border border-red-500/50 px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-red-300">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Registration Rejected</p>
                    <p className="text-[11px] text-red-200/70">Contact the election officer</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voting Action Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Voting Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-[#D4AF37]" />
                  <h2 className="text-lg font-black text-[#0B192C]">Ballot Submission Status</h2>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Election Status: <strong className="text-[#0B192C]">{election?.status.replace(/_/g, ' ')}</strong>
                </span>
              </div>

              {eligibility?.hasVoted ? (
                <div className="py-6 space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-black text-sm">Ballot Successfully Cast & Sealed</h3>
                      <p className="text-xs text-emerald-700 mt-1">
                        Your vote was recorded anonymously in the official cryptographic tally on{' '}
                        {eligibility.votedAt ? new Date(eligibility.votedAt).toLocaleString() : 'today'}. In accordance with Section 5 of the ELEDA election protocol, your selections are decoupled from your identity.
                      </p>
                    </div>
                  </div>

                  {eligibility.receiptCode && (
                    <div className="bg-[#0A1128] text-white p-5 rounded-2xl border border-[#1E3E62] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-[#F3C623]">
                          Official Digital Voting Receipt
                        </span>
                        <button
                          onClick={copyReceipt}
                          className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg"
                        >
                          {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedReceipt ? 'Copied' : 'Copy Code'}
                        </button>
                      </div>
                      <p className="font-mono text-base sm:text-lg font-bold text-white tracking-wider">
                        {eligibility.receiptCode}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Use this code on the public bulletin board to verify that your ballot remains counted in the final certified results.
                      </p>
                    </div>
                  )}
                </div>
              ) : isEligibleToVote ? (
                <div className="py-6 space-y-3">
                  <h3 className="text-xl font-black text-[#0B192C]">
                    The Voting Booth is Open for You!
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You are verified and eligible to submit your ballot. You may select one candidate per position (or submit an abstention where allowed). Review carefully before submitting; ballots cannot be modified after confirmation.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/vote"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#E5B80B] text-[#0A1128] shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                      <Vote className="w-5 h-5" />
                      Enter Secure Voting Booth
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-6 space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Voting Not Currently Available</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        {user?.approvalStatus !== 'APPROVED'
                          ? 'Your registration is still undergoing verification by the Electoral Committee. Once approved, the voting booth will activate.'
                          : `The election status is currently: ${election?.status.replace(/_/g, ' ')}. Please review the chronometer.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Blind-Token Single Use Architecture
              </span>
              <Link href="/results" className="text-[#0B192C] font-bold hover:text-[#D4AF37] flex items-center gap-1">
                View Election Results
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Chronometer & Guidelines */}
          <div className="space-y-6">
            {election && (
              <CountdownTimer
                startTime={election.startTime}
                endTime={election.endTime}
                status={election.status}
                timezone={election.timezone}
              />
            )}
          </div>
        </div>

        {/* Contested Positions & Manifestos Preview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#0B192C]">Contested Offices & Candidates</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any candidate to read their background and manifesto agenda.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.map(pos => (
              <div key={pos.id} className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/80 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded">
                    Position #{pos.orderIndex}
                  </span>
                  <h3 className="text-base font-black text-[#0B192C] mt-1">{pos.title}</h3>
                </div>

                <div className="space-y-3">
                  {pos.candidates.map(cand => (
                    <div
                      key={cand.id}
                      onClick={() => openCandidateModal(cand, pos.title)}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 cursor-pointer flex items-center gap-3 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-200">
                        <img
                          src={cand.photoUrl}
                          alt={cand.fullName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e: any) => {
                            e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[#0B192C] group-hover:text-[#D4AF37] truncate">
                          #{cand.candidateNumber} {cand.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate italic">
                          "{cand.campaignTagline}"
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#D4AF37]" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CandidateModal
        candidate={selectedCandidate}
        positionTitle={selectedPositionTitle}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}
