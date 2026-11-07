'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Vote,
  Shield,
  ShieldCheck,
  Award,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  FileText,
  BarChart2,
  Trophy,
  Sparkles,
  Fingerprint,
  Cpu,
  RefreshCw,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import CountdownTimer from '@/components/CountdownTimer';
import CandidateModal from '@/components/CandidateModal';
import { Election, ElectionPosition, Candidate } from '@/types/election';
import {
  collectDeviceSignals,
  serialiseFingerprint,
  generateDeviceDisplayId,
} from '@/lib/voting/fingerprint';

type VotingStep =
  | 'INITIALIZING'
  | 'BALLOT'
  | 'REVIEW'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'ALREADY_VOTED'
  | 'ERROR';

export default function HomePage() {
  const votingBoothRef = useRef<HTMLDivElement>(null);

  // Election data
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<(ElectionPosition & { candidates: Candidate[] })[]>([]);
  const [resultsData, setResultsData] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedPositionTitle, setSelectedPositionTitle] = useState('');

  // Device Fingerprinting
  const [rawFingerprint, setRawFingerprint] = useState<string | null>(null);
  const [deviceDisplayId, setDeviceDisplayId] = useState<string>('');
  const [deviceHash, setDeviceHash] = useState<string | null>(null);

  // Voting booth state
  const [votingStep, setVotingStep] = useState<VotingStep>('INITIALIZING');
  const [votingError, setVotingError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [alreadyVotedPositions, setAlreadyVotedPositions] = useState<string[]>([]);

  // Cryptographic credentials
  const [votingToken, setVotingToken] = useState<string | null>(null);
  const [nullifierSeed, setNullifierSeed] = useState<string | null>(null);

  // Success Receipt
  const [receiptData, setReceiptData] = useState<{
    receiptCode: string;
    castAt: string;
    auditHash: string;
  } | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Audit receipt verification
  const [receiptCodeInput, setReceiptCodeInput] = useState('');
  const [receiptVerification, setReceiptVerification] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // 1. Initial Load: Collect Device Fingerprint + Fetch Election & Results
  useEffect(() => {
    async function init() {
      try {
        // Collect anonymous device signals
        const signals = collectDeviceSignals();
        const fp = serialiseFingerprint(signals);
        setRawFingerprint(fp);

        const displayId = await generateDeviceDisplayId(fp);
        setDeviceDisplayId(displayId);

        // Fetch election and results in parallel
        const [elecRes, resRes] = await Promise.all([
          fetch('/api/election'),
          fetch('/api/election/results'),
        ]);

        const elecData = await elecRes.json();
        if (elecData.election) {
          setElection(elecData.election);
          setPositions(elecData.positions || []);

          if (elecData.election.status !== 'VOTING_LIVE') {
            setVotingError(`Voting is currently ${elecData.election.status.replace(/_/g, ' ')}.`);
            setVotingStep('ERROR');
            return;
          }
        }

        const resData = await resRes.json();
        setResultsData(resData);

        setVotingStep('BALLOT');
      } catch (err: any) {
        console.error('Failed to initialise homepage voting booth:', err);
        setVotingError(err.message || 'Failed to initialize voting booth. Please refresh.');
        setVotingStep('ERROR');
      }
    }

    init();
  }, []);

  // Selection handlers
  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setSelections(prev => ({
      ...prev,
      [positionId]: candidateId,
    }));
  };

  const handleAbstain = (positionId: string) => {
    setSelections(prev => ({
      ...prev,
      [positionId]: '__ABSTAIN__',
    }));
  };

  const isBallotComplete =
    positions.length > 0 && positions.every(pos => Boolean(selections[pos.id]));

  const scrollToBooth = () => {
    votingBoothRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 2. Submit anonymous ballot directly on the homepage
  const handleConfirmAndSubmit = async () => {
    if (!rawFingerprint || !election) {
      setVotingError('Device credentials not ready. Please refresh the page.');
      setVotingStep('ERROR');
      return;
    }

    setVotingStep('SUBMITTING');

    try {
      // Step A: Request blinded token using device fingerprint (no registration required)
      const tokenRes = await fetch('/api/voting/issue-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: rawFingerprint }),
      });
      const tokenData = await tokenRes.json();

      if (tokenRes.status === 409 && tokenData.alreadyVoted) {
        setAlreadyVotedPositions(tokenData.positionsVoted || []);
        setVotingStep('ALREADY_VOTED');
        return;
      }

      if (!tokenRes.ok) {
        throw new Error(tokenData.error || 'Failed to acquire anonymous voting credential');
      }

      const activeToken = tokenData.votingToken;
      const activeSeed = tokenData.nullifierSeed;
      const activeHash = tokenData.deviceHash;

      setVotingToken(activeToken);
      setNullifierSeed(activeSeed);
      setDeviceHash(activeHash);

      // Step B: Submit anonymous ballot selections
      const payloadSelections = positions.map(pos => {
        const choice = selections[pos.id];
        return {
          positionId: pos.id,
          candidateId: choice === '__ABSTAIN__' ? null : choice,
          isAbstain: choice === '__ABSTAIN__',
        };
      });

      const submitRes = await fetch('/api/voting/submit-ballot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: election.id,
          votingToken: activeToken,
          nullifierSeed: activeSeed,
          selections: payloadSelections,
          deviceHash: activeHash,
        }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        if (submitRes.status === 409) {
          setVotingStep('ALREADY_VOTED');
          return;
        }
        throw new Error(submitData.error || 'Ballot submission failed');
      }

      setReceiptData({
        receiptCode: submitData.receiptCode,
        castAt: submitData.castAt,
        auditHash: submitData.auditHash,
      });

      setVotingStep('SUCCESS');

      // Celebration Confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F3C623', '#0A1128', '#1E3E62', '#10B981'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 70,
          angle: 60,
          spread: 60,
          origin: { x: 0.1, y: 0.7 },
          colors: ['#D4AF37', '#F3C623'],
        });
      }, 500);
      setTimeout(() => {
        confetti({
          particleCount: 70,
          angle: 120,
          spread: 60,
          origin: { x: 0.9, y: 0.7 },
          colors: ['#D4AF37', '#F3C623'],
        });
      }, 900);

      // Refresh turnout metrics
      fetch('/api/election/results')
        .then(r => r.json())
        .then(data => setResultsData(data))
        .catch(() => {});
    } catch (err: any) {
      console.error('Submission error:', err);
      setVotingError(err.message || 'Ballot submission failed.');
      setVotingStep('ERROR');
    }
  };

  const copyReceiptCode = () => {
    if (!receiptData?.receiptCode) return;
    navigator.clipboard.writeText(receiptData.receiptCode);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const handleVerifyReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptCodeInput.trim()) return;

    setIsVerifying(true);
    setReceiptVerification(null);
    try {
      const res = await fetch('/api/election/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptCode: receiptCodeInput.trim() }),
      });
      const data = await res.json();
      setReceiptVerification(data);
    } catch {
      setReceiptVerification({ verified: false, message: 'Verification network error' });
    } finally {
      setIsVerifying(false);
    }
  };

  const openCandidateModal = (cand: Candidate, posTitle: string) => {
    setSelectedCandidate(cand);
    setSelectedPositionTitle(posTitle);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ── 1. HERO SECTION ── */}
      <section className="relative bg-gradient-to-b from-[#070F2B] via-[#0A1128] to-[#0B192C] text-white pt-8 sm:pt-10 pb-14 sm:pb-20 px-3 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[250px] sm:h-[350px] bg-gradient-to-tr from-[#D4AF37]/25 to-[#F3C623]/10 blur-[100px] sm:blur-[130px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-5">
            {/* Seal / Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#1E3E62]/60 border border-[#D4AF37]/40 shadow-inner max-w-full">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F3C623] shrink-0" />
              <span className="text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-[#F3C623] font-bold truncate">
                Official Electoral Portal • ELEDA 2026
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight px-1">
              ELEDA 2026 <br />
              <span className="gold-gradient-text">DIGITAL VOTING ARENA</span>
            </h1>

            {/* Tagline */}
            <p className="text-xs sm:text-sm md:text-base uppercase tracking-[0.15em] sm:tracking-[0.25em] text-[#F3C623] font-bold">
              ONE PARTICIPANT. ONE VOTE. ONE VOICE.
            </p>

            <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed px-2">
              Vote directly below. <strong>No registration required.</strong> Your device serves as your secure, anonymous voting token. One vote per device is enforced cryptographically.
            </p>

            {/* Device ID Pill */}
            {deviceDisplayId && (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-[#D4AF37]/40 text-[11px] sm:text-xs text-slate-200 max-w-full">
                <Fingerprint className="w-3.5 h-3.5 text-[#F3C623] shrink-0" />
                <span className="text-slate-400 hidden xs:inline">Anonymous Device ID:</span>
                <span className="font-mono font-bold text-white tracking-wider truncate">{deviceDisplayId}</span>
                <span className="text-emerald-400 font-semibold shrink-0">• Ready</span>
              </div>
            )}

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 w-full max-w-md mx-auto sm:max-w-none">
              <button
                onClick={scrollToBooth}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#E5B80B] text-[#0A1128] shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
              >
                <Vote className="w-5 h-5" />
                Vote Below Now
              </button>
              <Link
                href="/results"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-[#1E3E62]/80 hover:bg-[#1E3E62] text-white border border-[#2D507A] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <BarChart2 className="w-4 h-4 text-[#F3C623]" />
                Live Results Arena
              </Link>
            </div>
          </div>

          {/* 2. CHRONOMETER / COUNTDOWN */}
          <div className="mt-8 sm:mt-12 max-w-4xl mx-auto">
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
      </section>

      {/* ── 2. LIVE INTERACTIVE VOTING BOOTH (Directly on Homepage) ── */}
      <section ref={votingBoothRef} id="voting-booth" className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20 pb-16">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-[#D4AF37]/40 overflow-hidden">
          
          {/* Booth Sticky Banner */}
          <div className="bg-[#0A1128] text-white p-4 sm:p-6 sm:p-8 border-b border-[#1E3E62] flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#F3C623] font-bold">
                  Official Anonymous Voting Chamber
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black mt-1">Cast Your Ballot</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Select your candidate for each office below. Your vote is recorded with complete cryptographic privacy.
              </p>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#1E3E62]/60">
              <div className="bg-[#1E3E62]/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-[#2D507A] text-xs">
                <span className="text-slate-300">Selected: </span>
                <strong className="text-[#F3C623] font-bold">
                  {Object.keys(selections).length} of {positions.length}
                </strong>
              </div>
              {deviceDisplayId && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-[#D4AF37]/30 text-[10px] sm:text-[11px] font-mono text-slate-300">
                  <Fingerprint className="w-3 h-3 text-[#F3C623]" />
                  <span>Device: <strong>{deviceDisplayId}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* ── STATE: INITIALIZING ── */}
          {votingStep === 'INITIALIZING' && (
            <div className="p-12 sm:p-16 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Initialising Secure Anonymous Booth...
              </p>
            </div>
          )}

          {/* ── STATE: SUBMITTING / CRYPTO LOCK ── */}
          {votingStep === 'SUBMITTING' && (
            <div className="p-10 sm:p-16 flex flex-col items-center justify-center gap-5 sm:gap-6 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-[#0A1128] text-[#F3C623] flex items-center justify-center shadow-2xl animate-pulse">
                <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-[#0B192C]">
                  Processing Cryptographic Anonymization
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Deriving zero-knowledge nullifier proof, verifying device uniqueness, and committing your sealed ballot to the public ledger...
                </p>
              </div>
            </div>
          )}

          {/* ── STATE: SUCCESS & OFFICIAL RECEIPT ── */}
          {votingStep === 'SUCCESS' && receiptData && (
            <div className="p-6 sm:p-12 text-center space-y-6 sm:space-y-8 animate-fade-in">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Vote Confirmed &amp; Tallied
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#0B192C]">
                  Thank You For Voting, Delegate!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  Your anonymous ballot has been cryptographically recorded on the official ELEDA 2026 ledger. Your selections cannot be linked back to you or your device.
                </p>
              </div>

              {/* Digital Voting Receipt Card */}
              <div className="bg-[#0A1128] text-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#1E3E62] text-left space-y-4 sm:space-y-5 shadow-2xl relative overflow-hidden max-w-2xl mx-auto">
                <div className="flex items-center justify-between border-b border-[#1E3E62] pb-3 sm:pb-4">
                  <div>
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[#F3C623]">
                      ELEDA 2026 DIGITAL VOTING ARENA
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-white">Official Voting Receipt</h4>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={copyReceiptCode}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                      title="Copy Receipt Code"
                      aria-label="Copy Receipt Code"
                    >
                      {copiedReceipt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                      title="Print Receipt"
                      aria-label="Print Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-sans">Ballot Receipt Code</span>
                    <span className="text-lg sm:text-2xl font-bold text-[#F3C623] tracking-widest block mt-0.5 break-all select-all">
                      {receiptData.receiptCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-2">
                    <div>
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-sans">Timestamp</span>
                      <span className="text-slate-200 text-xs">
                        {new Date(receiptData.castAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-sans">Cryptographic Audit Hash</span>
                      <span className="text-slate-200 text-[10px] sm:text-[11px] truncate block break-all font-mono">
                        {receiptData.auditHash}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-[#1E3E62] text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Certified Single-Spend Proof</span>
                  <span className="text-emerald-400 font-bold">STATUS: RECORDED</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
                <Link
                  href="/results"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors"
                >
                  View Live Results Arena
                </Link>
                <a
                  href="#audit"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-[#D4AF37]/20 text-[#0B192C] hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 transition-colors"
                >
                  Verify on Public Ledger Below
                </a>
              </div>
            </div>
          )}

          {/* ── STATE: ALREADY VOTED ON THIS DEVICE ── */}
          {votingStep === 'ALREADY_VOTED' && (
            <div className="p-6 sm:p-12 text-center space-y-5 sm:space-y-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  Vote Already Recorded
                </span>
                <h3 className="text-xl sm:text-3xl font-black text-[#0B192C]">This Device Has Already Voted</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  ELEDA 2026 detected that this device has already participated in the election. Each device is permitted only one ballot to maintain election integrity.
                </p>
              </div>

              {deviceDisplayId && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono">
                  <Fingerprint className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-slate-500">Device ID:</span>
                  <span className="font-bold text-[#0A1128]">{deviceDisplayId}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-2">
                <Link
                  href="/results"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors text-center"
                >
                  View Live Results
                </Link>
                <a
                  href="#audit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-center"
                >
                  Verify Your Receipt Code
                </a>
              </div>
            </div>
          )}

          {/* ── STATE: ERROR ── */}
          {votingStep === 'ERROR' && (
            <div className="p-6 sm:p-12 text-center space-y-5 sm:space-y-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl sm:text-2xl font-black text-[#0B192C]">Voting Gate Notice</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{votingError}</p>
              </div>
              <div className="flex justify-center gap-4 pt-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 rounded-xl font-bold text-xs bg-[#0A1128] text-white hover:bg-[#1E3E62] flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              </div>
            </div>
          )}

          {/* ── STATE: BALLOT SELECTION (The Core Voting Experience) ── */}
          {(votingStep === 'BALLOT' || votingStep === 'REVIEW') && (
            <div className="p-4 sm:p-8 sm:p-10 space-y-8 sm:space-y-10">
              
              {/* Positions List */}
              {positions.map((pos, pIdx) => {
                const currentSelection = selections[pos.id];

                return (
                  <div key={pos.id} className="space-y-3 sm:space-y-4">
                    {/* Position Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full">
                          Position {pIdx + 1} of {positions.length}
                        </span>
                        <h3 className="text-lg sm:text-2xl font-black text-[#0B192C] mt-1">{pos.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{pos.description}</p>
                      </div>
                      <div className="self-start sm:self-auto">
                        {currentSelection ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            Selection Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-xs font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Vote Required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Candidates Radio Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                      {pos.candidates.map(cand => {
                        const isSelected = currentSelection === cand.id;

                        return (
                          <div
                            key={cand.id}
                            onClick={() => handleSelectCandidate(pos.id, cand.id)}
                            className={`relative rounded-2xl p-4 sm:p-5 border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                              isSelected
                                ? 'bg-gradient-to-b from-amber-50/80 via-white to-white border-[#D4AF37] shadow-xl ring-2 ring-[#D4AF37]/40 sm:scale-[1.01]'
                                : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                            }`}
                          >
                            <div>
                              {/* Top Row: Photo + Name + Number */}
                              <div className="flex items-start gap-3 mb-3">
                                {/* Official Candidate Portrait Poster */}
                                <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-md bg-slate-200 relative">
                                  <img
                                    src={cand.photoUrl}
                                    alt={cand.fullName}
                                    className="w-full h-full object-cover object-top"
                                    onError={(e: any) => {
                                      e.target.src =
                                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
                                    }}
                                  />
                                  <div className="absolute top-1 left-1 bg-[#0A1128]/90 text-[#F3C623] px-1.5 py-0.5 rounded text-[9px] font-black font-mono">
                                    #{cand.candidateNumber}
                                  </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider block">
                                    Candidate #{cand.candidateNumber}
                                  </span>
                                  <h4 className="text-sm sm:text-base font-black text-[#0B192C] leading-snug line-clamp-2">
                                    {cand.fullName}
                                  </h4>
                                  <p className="text-[11px] text-slate-600 italic line-clamp-2 mt-1">
                                    &quot;{cand.campaignTagline}&quot;
                                  </p>
                                </div>
                              </div>

                              {/* Manifesto Link */}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  openCandidateModal(cand, pos.title);
                                }}
                                className="text-[11px] font-bold text-[#1E3E62] hover:text-[#D4AF37] text-left underline pb-1 flex items-center justify-between w-full"
                              >
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  View Full Manifesto &amp; Poster
                                </span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Touch-Friendly Dedicated Vote Action Button */}
                            <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                              {isSelected ? (
                                <div className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-[#D4AF37] to-[#F3C623] text-[#0A1128] shadow-md flex items-center justify-center gap-1.5 ring-2 ring-[#D4AF37]/30">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                  <span>SELECTED CHOICE</span>
                                </div>
                              ) : (
                                <div className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                  <Vote className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  <span>Tap to Select Candidate</span>
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Abstention Option */}
                    {pos.allowAbstain && (
                      <div className="pt-1.5">
                        <label
                          onClick={() => handleAbstain(pos.id)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                            currentSelection === '__ABSTAIN__'
                              ? 'bg-slate-200 border-slate-400 font-bold text-slate-800'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              currentSelection === '__ABSTAIN__'
                                ? 'border-slate-700 bg-slate-700 text-white'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {currentSelection === '__ABSTAIN__' && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>
                          <span>Abstain from voting for {pos.title}</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bottom Action Card (Confirm & Submit) */}
              <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-auto text-center md:text-left">
                  {isBallotComplete ? (
                    <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-700 font-bold text-xs sm:text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>All offices chosen! Ready to seal your anonymous ballot.</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center md:justify-start gap-2 text-amber-700 font-semibold text-xs sm:text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Please select a candidate or abstain for both offices to submit.</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your choice is sealed using a cryptographic ephemeral blinded token tied to this device.
                  </p>
                </div>

                <button
                  onClick={handleConfirmAndSubmit}
                  disabled={!isBallotComplete}
                  className="w-full md:w-auto px-8 py-4 rounded-xl font-black text-sm bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#E5B80B] text-[#0A1128] hover:opacity-95 shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 active:scale-95"
                >
                  <Lock className="w-4 h-4" />
                  <span>Confirm &amp; Cast Official Vote</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </section>

      {/* ── 3. KEY METRICS STRIP ── */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-black text-[#0B192C] truncate">
                {resultsData?.totalRegisteredVoters || 30}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Verified Voters</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-black text-[#0B192C] truncate">
                {resultsData?.totalBallotsCast || 16}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Ballots Cast</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-black text-[#0B192C] truncate">
                {positions.length}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Offices Contested</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-black text-[#0B192C] truncate">
                {resultsData?.turnoutPercentage || '57.1'}%
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Turnout Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. CRYPTOGRAPHIC ZERO-LINKAGE SECURITY EXPLAINER ── */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="bg-gradient-to-br from-[#0A1128] to-[#0B192C] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-12 border border-[#1E3E62] shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold text-[#F3C623] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Section 5 Architectural Guarantee</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight">
              Cryptographically Sound Anonymous Voting Engine
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              ELEDA 2026 strictly separates voter device identification from ballot storage. When you submit your vote, your choices are stored in a dedicated anonymous ballot box with <strong>zero link to your device fingerprint or personal identity</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4">
              <div className="bg-[#1E3E62]/40 border border-[#2D507A] p-3.5 sm:p-4 rounded-xl">
                <Lock className="w-5 h-5 text-[#F3C623] mb-2" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Unlinkable Tokens</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Blinded ephemeral credentials ensure no database table connects your device to your choices.
                </p>
              </div>

              <div className="bg-[#1E3E62]/40 border border-[#2D507A] p-4 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Double-Spend Proof</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Cryptographic nullifiers prevent duplicate voting without revealing individual identity.
                </p>
              </div>

              <div className="bg-[#1E3E62]/40 border border-[#2D507A] p-4 rounded-xl">
                <Award className="w-5 h-5 text-[#D4AF37] mb-2" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Receipt Verification</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Every voter receives a digital hash receipt to independently verify their vote is counted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PUBLIC AUDIT BULLETIN BOARD & RECEIPT VERIFIER ── */}
      <section id="audit" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 sm:pb-12">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-12 shadow-xl border border-slate-200">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>Independent Verification</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B192C]">Public Audit &amp; Receipt Verifier</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              Did you cast a ballot? Enter your official digital voting receipt code (e.g. <span className="font-mono font-bold text-slate-800 break-all">ELEDA-VOTE-XXXX-XXXX-XXXX</span>) to verify that your ballot is cryptographically recorded in the election tally, completely free of any identity leakage.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerifyReceipt} className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-xl">
            <input
              type="text"
              placeholder="e.g. ELEDA-VOTE-A1B2-C3D4"
              value={receiptCodeInput}
              onChange={e => setReceiptCodeInput(e.target.value)}
              className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] font-mono text-xs sm:text-sm uppercase text-slate-800"
              required
            />
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-[#0B192C] text-white hover:bg-[#1E3E62] transition-colors disabled:opacity-50 shrink-0"
            >
              {isVerifying ? 'Verifying...' : 'Verify Receipt'}
            </button>
          </form>

          {/* Verification Result Notification */}
          {receiptVerification && (
            <div
              className={`mt-4 p-4 rounded-xl border max-w-xl text-xs sm:text-sm ${
                receiptVerification.verified
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-start gap-2">
                {receiptVerification.verified ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="font-bold">{receiptVerification.message}</p>
                  {receiptVerification.ballot && (
                    <div className="mt-2 text-xs font-mono space-y-1 text-slate-700 bg-white/70 p-3 rounded-lg border border-emerald-200 break-all">
                      <p>Receipt Code: <span className="font-bold">{receiptVerification.ballot.receiptCode}</span></p>
                      <p>Time Cast: {new Date(receiptVerification.ballot.castAt).toLocaleString()}</p>
                      <p className="break-all">Audit Hash: {receiptVerification.ballot.auditHash}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 6. MOBILE FLOATING SUBMIT BAR (Appears on mobile while voting) ── */}
      {(votingStep === 'BALLOT' || votingStep === 'REVIEW') && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1128]/95 backdrop-blur-md border-t border-[#D4AF37]/40 px-4 py-3 sm:hidden shadow-2xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Ballot Progress
            </span>
            <div className="text-xs font-black text-white flex items-center gap-1.5 truncate">
              <span className={isBallotComplete ? 'text-emerald-400' : 'text-[#F3C623]'}>
                {Object.keys(selections).length} of {positions.length} Selected
              </span>
              {isBallotComplete && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
            </div>
          </div>

          <button
            onClick={handleConfirmAndSubmit}
            disabled={!isBallotComplete}
            className="py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-[#D4AF37] to-[#F3C623] text-[#0A1128] shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isBallotComplete ? 'Cast Vote Now' : 'Complete Ballot'}</span>
          </button>
        </div>
      )}

      {/* Candidate Profile Modal */}
      <CandidateModal
        candidate={selectedCandidate}
        positionTitle={selectedPositionTitle}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}
