'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, QrCode, CheckCircle2, Award, FileText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#070F2B] text-slate-400 border-t border-[#1E3E62] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand & Tagline */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white tracking-wider">
                ELEDA <span className="gold-gradient-text">2026</span>
              </span>
            </div>
            <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
              ONE PARTICIPANT. ONE VOTE. ONE VOICE.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              The premier, secure, and mobile-responsive digital voting platform for ELEDA 2026. Empowering registered delegates with verifiable, anonymous, and manipulation-proof democratic participation.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Cryptographically Certified Architecture</span>
            </div>
          </div>

          {/* Core Navigation */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-bold text-white mb-4 border-l-2 border-[#D4AF37] pl-2">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-[#F3C623] transition-colors">
                  Voting Arena Home
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-[#F3C623] transition-colors">
                  Voter Registration & Verification
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#F3C623] transition-colors">
                  Delegate Portal Login
                </Link>
              </li>
              <li>
                <Link href="/results" className="hover:text-[#F3C623] transition-colors">
                  Live Election Statistics
                </Link>
              </li>
              <li>
                <Link href="/winners" className="hover:text-[#F3C623] transition-colors">
                  Winner Announcements
                </Link>
              </li>
              <li>
                <Link href="/#audit" className="hover:text-[#F3C623] transition-colors">
                  Public Audit Bulletin Board
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Cryptographic Guarantees */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-bold text-white mb-4 border-l-2 border-[#D4AF37] pl-2">
              Security Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Blinded Ephemeral Voting Tokens</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Zero-Linkage Anonymous Ballots</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Cryptographic Nullifier Deduplication</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Server-Side Atomic State Machine</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Independently Auditable Hash Ledger</span>
              </li>
            </ul>
          </div>

          {/* Mobile QR Code & Quick Access */}
          <div className="bg-[#0B192C] p-4 rounded-xl border border-[#1E3E62] text-center flex flex-col items-center">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-[#F3C623]" />
              Mobile Voting Access
            </h4>
            <p className="text-[11px] text-slate-400 mb-3">
              Scan with your smartphone camera to vote securely on your mobile device.
            </p>
            {/* Elegant SVG QR Code Representation */}
            <div className="w-28 h-28 bg-white p-2 rounded-lg shadow-inner flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="white" />
                {/* Corner Squares */}
                <rect x="10" y="10" width="24" height="24" fill="#0A1128" />
                <rect x="14" y="14" width="16" height="16" fill="white" />
                <rect x="18" y="18" width="8" height="8" fill="#D4AF37" />

                <rect x="66" y="10" width="24" height="24" fill="#0A1128" />
                <rect x="70" y="14" width="16" height="16" fill="white" />
                <rect x="74" y="18" width="8" height="8" fill="#D4AF37" />

                <rect x="10" y="66" width="24" height="24" fill="#0A1128" />
                <rect x="14" y="70" width="16" height="16" fill="white" />
                <rect x="18" y="74" width="8" height="8" fill="#D4AF37" />

                {/* Random Pattern Dots */}
                <rect x="42" y="12" width="6" height="6" fill="#0A1128" />
                <rect x="52" y="16" width="6" height="6" fill="#0A1128" />
                <rect x="46" y="26" width="6" height="6" fill="#0A1128" />
                <rect x="16" y="46" width="6" height="6" fill="#0A1128" />
                <rect x="26" y="42" width="6" height="6" fill="#0A1128" />
                <rect x="38" y="38" width="8" height="8" fill="#D4AF37" />
                <rect x="54" y="42" width="6" height="6" fill="#0A1128" />
                <rect x="68" y="46" width="6" height="6" fill="#0A1128" />
                <rect x="80" y="40" width="6" height="6" fill="#0A1128" />
                <rect x="42" y="58" width="6" height="6" fill="#0A1128" />
                <rect x="52" y="66" width="6" height="6" fill="#0A1128" />
                <rect x="62" y="58" width="6" height="6" fill="#0A1128" />
                <rect x="46" y="76" width="6" height="6" fill="#0A1128" />
                <rect x="68" y="72" width="6" height="6" fill="#0A1128" />
                <rect x="80" y="80" width="6" height="6" fill="#0A1128" />
              </svg>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              eleda2026.org/vote
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#1E3E62]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-center sm:text-left">
          <p>© 2026 ELEDA Independent Electoral Committee. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-6 text-slate-400">
            <span>Election Privacy Standard ISO/IEC 27001 compliant</span>
            <span className="hidden sm:inline">•</span>
            <Link href="/admin" className="text-slate-400 hover:text-[#F3C623] transition-colors font-medium">
              Electoral Officer Access
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
