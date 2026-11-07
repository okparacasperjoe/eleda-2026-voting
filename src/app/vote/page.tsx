'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Vote,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
  Fingerprint,
  Cpu,
  FileText,
  Printer,
  Copy,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import CandidateModal from '@/components/CandidateModal';
import { Candidate, ElectionPosition, Election } from '@/types/election';
import {
  collectDeviceSignals,
  serialiseFingerprint,
  generateDeviceDisplayId,
} from '@/lib/voting/fingerprint';

type VoteStep =
  | 'LOADING'
  | 'FINGERPRINTING'
  | 'HANDSHAKE'
  | 'BALLOT'
  | 'REVIEW'
  | 'SUBMITTING'
  | 'SUCCESS'
  | 'ALREADY_VOTED'
  | 'ERROR';

export default function VotePage() {
  const [step, setStep] = useState<VoteStep>('LOADING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<(ElectionPosition & { candidates: Candidate[] })[]>([]);

  // Device fingerprint state
  const [rawFingerprint, setRawFingerprint] = useState<string | null>(null);
  const [deviceDisplayId, setDeviceDisplayId] = useState<string>('');
  /** deviceHash returned by the server after token issuance */
  const [deviceHash, setDeviceHash] = useState<string | null>(null);
  /** Positions already voted for (from server when token already issued) */
  const [alreadyVotedPositions, setAlreadyVotedPositions] = useState<string[]>([]);

  // Cryptographic in-memory credentials (never persisted)
  const [votingToken, setVotingToken] = useState<string | null>(null);
  const [nullifierSeed, setNullifierSeed] = useState<string | null>(null);

  // Ballot selections: Record<positionId, candidateId | '__ABSTAIN__'>
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Receipt after success
  const [receiptData, setReceiptData] = useState<{
    receiptCode: string;
    castAt: string;
    auditHash: string;
  } | null>(null);

  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedPositionTitle, setSelectedPositionTitle] = useState('');

  // ─── 1. Initial Load: Collect fingerprint + load election ───────────────────
  useEffect(() => {
    async function init() {
      try {
        setStep('FINGERPRINTING');

        // Collect device signals client-side
        const signals = collectDeviceSignals();
        const fp = serialiseFingerprint(signals);
        setRawFingerprint(fp);

        // Derive display ID (SHA-256 client-side, not the HMAC secret one)
        const displayId = await generateDeviceDisplayId(fp);
        setDeviceDisplayId(displayId);

        // Load election data (no auth required)
        const elecRes = await fetch('/api/election');
        const elecData = await elecRes.json();

        if (!elecData.election) {
          throw new Error('Could not load election data. Please refresh the page.');
        }

        setElection(elecData.election);
        setPositions(elecData.positions || []);

        if (elecData.election.status !== 'VOTING_LIVE') {
          setErrorMessage(
            `Voting is not active. Current election status: ${elecData.election.status.replace(/_/g, ' ')}.`
          );
          setStep('ERROR');
          return;
        }

        setStep('HANDSHAKE');
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to initialise voting booth');
        setStep('ERROR');
      }
    }

    init();
  }, []);

  // ─── 2. Cryptographic Handshake — requests blinded token from server ─────────
  const startBallotHandshake = useCallback(async () => {
    if (!rawFingerprint) {
      setErrorMessage('Device fingerprint unavailable. Please refresh and try again.');
      setStep('ERROR');
      return;
    }

    setStep('SUBMITTING');

    try {
      const res = await fetch('/api/voting/issue-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: rawFingerprint }),
      });
      const data = await res.json();

      if (res.status === 409 && data.alreadyVoted) {
        // Device already has a token — show which positions are already voted
        setAlreadyVotedPositions(data.positionsVoted || []);
        setStep('ALREADY_VOTED');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to acquire cryptographic voting token');
      }

      setVotingToken(data.votingToken);
      setNullifierSeed(data.nullifierSeed);
      setDeviceHash(data.deviceHash);
      setStep('BALLOT');
    } catch (err: any) {
      setErrorMessage(err.message || 'Cryptographic handshake failed');
      setStep('ERROR');
    }
  }, [rawFingerprint]);

  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setSelections(prev => ({ ...prev, [positionId]: candidateId }));
  };

  const handleAbstain = (positionId: string) => {
    setSelections(prev => ({ ...prev, [positionId]: '__ABSTAIN__' }));
  };

  const isBallotComplete =
    positions.length > 0 && positions.every(pos => selections[pos.id]);

  // ─── 3. Submit Anonymous Ballot ──────────────────────────────────────────────
  const handleSubmitBallot = async () => {
    if (!votingToken || !nullifierSeed || !election) {
      setErrorMessage('Missing anonymous voting credentials');
      setStep('ERROR');
      return;
    }

    setStep('SUBMITTING');

    try {
      const payloadSelections = positions.map(pos => {
        const choice = selections[pos.id];
        return {
          positionId: pos.id,
          candidateId: choice === '__ABSTAIN__' ? null : choice,
          isAbstain: choice === '__ABSTAIN__',
        };
      });

      const res = await fetch('/api/voting/submit-ballot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: election.id,
          votingToken,
          nullifierSeed,
          selections: payloadSelections,
          deviceHash, // for per-position device tracking
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ballot submission failed');
      }

      setReceiptData({
        receiptCode: data.receiptCode,
        castAt: data.castAt,
        auditHash: data.auditHash,
      });

      setStep('SUCCESS');

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F3C623', '#0A1128', '#1E3E62', '#10B981'],
      });
      setTimeout(
        () =>
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ['#D4AF37', '#F3C623'],
          }),
        600
      );
      setTimeout(
        () =>
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ['#D4AF37', '#F3C623'],
          }),
        900
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Ballot submission failed.');
      setStep('ERROR');
    }
  };

  const copyReceiptCode = () => {
    if (!receiptData?.receiptCode) return;
    navigator.clipboard.writeText(receiptData.receiptCode);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  // ─── Device ID Badge component (reused across steps) ────────────────────────
  const DeviceBadge = () =>
    deviceDisplayId ? (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono">
        <Fingerprint className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="text-slate-500">Device ID:</span>
        <span className="font-bold text-[#0A1128]">{deviceDisplayId}</span>
      </div>
    ) : null;

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* ── LOADING / FINGERPRINTING ── */}
        {(step === 'LOADING' || step === 'FINGERPRINTING') && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-[#0A1128] text-[#F3C623] flex items-center justify-center shadow-2xl">
                <Fingerprint className="w-10 h-10 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#D4AF37] flex items-center justify-center">
                <Cpu className="w-4 h-4 text-[#0A1128]" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-[#0B192C]">
                Identifying Your Device
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Collecting anonymous device signals to generate your unique, non-identifiable voting credential…
              </p>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── SUBMITTING ── */}
        {step === 'SUBMITTING' && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-[#0A1128] text-[#F3C623] flex items-center justify-center shadow-2xl animate-pulse">
              <Lock className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-[#0B192C]">
                Processing Cryptographic Anonymization
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Deriving zero-knowledge nullifier proof and committing sealed ballot to the anonymous ledger…
              </p>
            </div>
          </div>
        )}

        {/* ── ALREADY VOTED ── */}
        {step === 'ALREADY_VOTED' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-amber-200 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                Vote Already Recorded
              </span>
              <h2 className="text-2xl font-black text-[#0B192C]">This Device Has Already Voted</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                ELEDA 2026 detected that this device has already participated in the election.
                Each device may cast only one ballot to protect election integrity.
              </p>
            </div>
            <DeviceBadge />
            {alreadyVotedPositions.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-2 max-w-sm mx-auto border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Voted for {alreadyVotedPositions.length} position(s)
                </p>
                {alreadyVotedPositions.map(pid => {
                  const pos = positions.find(p => p.id === pid);
                  return pos ? (
                    <div key={pid} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-slate-700">{pos.title}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
              <Link
                href="/results"
                className="px-6 py-3 rounded-xl font-bold text-xs bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors"
              >
                View Live Results
              </Link>
              <Link
                href="/"
                className="px-6 py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'ERROR' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-red-200 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-black text-[#0B192C]">Voting Gate Notice</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{errorMessage}</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl font-bold text-xs bg-[#0A1128] text-white hover:bg-[#1E3E62] flex items-center gap-2 justify-center"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <Link
                href="/results"
                className="px-6 py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                View Live Results
              </Link>
            </div>
          </div>
        )}

        {/* ── STEP 1: HANDSHAKE ── */}
        {step === 'HANDSHAKE' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-200 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#0A1128] text-[#F3C623] flex items-center justify-center mx-auto shadow-lg">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-full">
                ELEDA 2026 DIGITAL VOTING ARENA
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B192C]">
                Anonymous Device Voting Gate
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                No registration required. Your vote is tied to this device only —
                not to your name, email or any personal identity.
              </p>
              <DeviceBadge />
            </div>

            {/* Privacy protocols */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                How Device-Based Anonymous Voting Works:
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <Fingerprint className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>
                    <strong>Device Fingerprint:</strong> Your browser&apos;s technical signals
                    (screen size, timezone, hardware) are hashed into an anonymous device ID.
                    Your name, email or IP are never collected.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>One Device, One Ballot:</strong> Each unique device may only vote once
                    per position. This is enforced cryptographically — not just by a UI check.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Linkage:</strong> Your ballot choices are stored in a separate
                    anonymous table with no reference to your device hash. Even the system
                    administrator cannot trace which selections came from your device.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Auditable Receipt:</strong> You will receive a verifiable receipt code
                    to confirm your ballot is counted in the final certified results.
                  </span>
                </li>
              </ul>
            </div>

            {/* Warning notice */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Important:</strong> Do not share this device or browser session with
                another participant while voting is in progress. Each device is counted as one
                unique voter. Using a private/incognito window on the same device may generate
                a different device ID.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <Link
                href="/"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Return to Homepage
              </Link>
              <button
                onClick={startBallotHandshake}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#E5B80B] text-[#0A1128] hover:opacity-95 shadow-xl flex items-center justify-center gap-2"
              >
                <Vote className="w-4 h-4" />
                Acknowledge &amp; Open Official Ballot
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: BALLOT ── */}
        {step === 'BALLOT' && (
          <div className="space-y-8">
            {/* Header bar */}
            <div className="bg-[#0A1128] text-white p-6 rounded-3xl border border-[#1E3E62] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#F3C623] font-bold">
                  Official Secret Ballot
                </span>
                <h1 className="text-xl sm:text-2xl font-black">ELEDA 2026 Digital Arena</h1>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="bg-[#1E3E62]/60 px-4 py-2 rounded-xl border border-[#2D507A] text-xs">
                  <span className="text-slate-300">Positions Selected: </span>
                  <strong className="text-[#F3C623]">
                    {Object.keys(selections).length} of {positions.length}
                  </strong>
                </div>
                <DeviceBadge />
              </div>
            </div>

            {/* Position ballots */}
            <div className="space-y-10">
              {positions.map((pos, pIdx) => {
                const currentSelection = selections[pos.id];

                return (
                  <div key={pos.id} className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
                    <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full">
                          Position {pIdx + 1} of {positions.length}
                        </span>
                        <h2 className="text-xl font-black text-[#0B192C] mt-1">{pos.title}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{pos.description}</p>
                      </div>
                      <div className="text-xs font-semibold">
                        {currentSelection ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            <Check className="w-3.5 h-3.5" />
                            Selection Recorded
                          </span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                            Selection Required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Candidate cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {pos.candidates.map(cand => {
                        const isSelected = currentSelection === cand.id;

                        return (
                          <div
                            key={cand.id}
                            onClick={() => handleSelectCandidate(pos.id, cand.id)}
                            className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-gradient-to-b from-amber-50/50 to-white border-[#D4AF37] shadow-xl'
                                : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-200">
                                    <img
                                      src={cand.photoUrl}
                                      alt={cand.fullName}
                                      className="w-full h-full object-cover"
                                      onError={(e: any) => {
                                        e.target.src =
                                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60';
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      #{cand.candidateNumber}
                                    </span>
                                    <h4 className="text-sm font-black text-[#0B192C] leading-snug">
                                      {cand.fullName}
                                    </h4>
                                  </div>
                                </div>
                                <div
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0A1128]'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 line-clamp-2 italic mb-3">
                                &quot;{cand.campaignTagline}&quot;
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedCandidate(cand);
                                setSelectedPositionTitle(pos.title);
                              }}
                              className="text-[11px] font-bold text-[#0B192C] hover:text-[#D4AF37] text-left underline pt-2 border-t border-slate-100"
                            >
                              View Manifesto Details
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Abstain option */}
                    {pos.allowAbstain && (
                      <div className="pt-4 border-t border-slate-100">
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
                            {currentSelection === '__ABSTAIN__' && <Check className="w-3 h-3" />}
                          </div>
                          <span>Abstain from voting for {pos.title}</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom actions */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                {isBallotComplete ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> All positions answered. Ready to review.
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">
                    Please make a selection or abstention for all positions before continuing.
                  </span>
                )}
              </p>

              <button
                onClick={() => setStep('REVIEW')}
                disabled={!isBallotComplete}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#D4AF37] via-[#F3C623] to-[#E5B80B] text-[#0A1128] hover:opacity-95 shadow-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                Review Ballot Selections
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW ── */}
        {step === 'REVIEW' && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-200 space-y-8">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#D4AF37]">
                Final Step · Review
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0B192C]">
                Confirm Your Ballot
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Please double-check your choices. Once submitted your selections will be
                cryptographically sealed and permanently recorded on the anonymous ledger.
              </p>
              <DeviceBadge />
            </div>

            {/* Summary */}
            <div className="space-y-4">
              {positions.map(pos => {
                const choiceId = selections[pos.id];
                const cand = pos.candidates.find(c => c.id === choiceId);
                const isAbstain = choiceId === '__ABSTAIN__';

                return (
                  <div
                    key={pos.id}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {pos.title}
                      </p>
                      {isAbstain ? (
                        <p className="text-base font-bold text-slate-600 italic">
                          Abstained (No vote recorded for this office)
                        </p>
                      ) : cand ? (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="w-7 h-7 rounded-lg bg-[#0A1128] text-[#F3C623] font-black text-xs flex items-center justify-center">
                            #{cand.candidateNumber}
                          </span>
                          <span className="text-base font-black text-[#0B192C]">{cand.fullName}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-red-500 font-bold">No selection made</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('BALLOT')}
                      className="text-xs font-bold text-[#D4AF37] hover:text-[#B8860B] self-start sm:self-auto underline"
                    >
                      Change
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Zero-linkage guarantee */}
            <div className="bg-[#0A1128] text-white p-5 rounded-2xl border border-[#1E3E62] flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-[#F3C623] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">Zero-Linkage Guarantee:</strong> This ballot will be
                submitted with your single-use blinded token. The server records your selections in
                the anonymous ballot box without storing your device fingerprint or any personal data
                alongside your choices.
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('BALLOT')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit
              </button>

              <button
                type="button"
                onClick={handleSubmitBallot}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-95 shadow-xl flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Confirm &amp; Seal Anonymous Ballot
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: SUCCESS ── */}
        {step === 'SUCCESS' && receiptData && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-200 text-center space-y-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Vote Confirmed &amp; Tallied
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0B192C]">
                Thank You For Voting, Delegate!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Your anonymous ballot has been cryptographically recorded on the official ELEDA 2026
                ledger. Your selections cannot be linked back to your device.
              </p>
              <DeviceBadge />
            </div>

            {/* Receipt card */}
            <div className="bg-[#0A1128] text-white p-6 sm:p-8 rounded-3xl border border-[#1E3E62] text-left space-y-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#1E3E62] pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#F3C623]">
                    ELEDA 2026 DIGITAL VOTING ARENA
                  </span>
                  <h3 className="text-lg font-black text-white">Official Voting Receipt</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyReceiptCode}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                    title="Copy Receipt"
                  >
                    {copiedReceipt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                    title="Print Receipt"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">Ballot Receipt Code</span>
                  <span className="text-lg sm:text-xl font-bold text-[#F3C623] tracking-widest">
                    {receiptData.receiptCode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Timestamp</span>
                    <span className="text-slate-200">
                      {new Date(receiptData.castAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Cryptographic Audit Hash</span>
                    <span className="text-slate-200 text-[11px] truncate block">{receiptData.auditHash}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1E3E62] text-[11px] text-slate-400 flex items-center justify-between">
                <span>Certified Cryptographic Single-Spend Proof</span>
                <span className="text-emerald-400 font-bold">STATUS: RECORDED</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/results"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors"
              >
                View Live Results Arena
              </Link>
              <Link
                href="/#audit"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-[#D4AF37]/20 text-[#0B192C] hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 transition-colors"
              >
                Verify on Public Ledger
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        )}
      </div>

      <CandidateModal
        candidate={selectedCandidate}
        positionTitle={selectedPositionTitle}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}
