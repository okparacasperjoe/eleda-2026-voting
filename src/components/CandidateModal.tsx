'use client';

import React from 'react';
import { X, Award, CheckCircle2, FileText, User } from 'lucide-react';
import { Candidate } from '@/types/election';

interface CandidateModalProps {
  candidate: Candidate | null;
  positionTitle?: string;
  onClose: () => void;
}

export default function CandidateModal({ candidate, positionTitle, onClose }: CandidateModalProps) {
  if (!candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="sticky top-0 bg-[#0A1128] text-white p-4 sm:p-6 flex items-center justify-between border-b border-[#1E3E62] z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#D4AF37] text-[#0A1128] font-black text-base sm:text-lg flex items-center justify-center shadow-md shrink-0">
              #{candidate.candidateNumber}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#F3C623] font-bold truncate">
                {positionTitle || 'Contested Position'}
              </p>
              <h3 className="text-base sm:text-xl font-black text-white truncate">{candidate.fullName}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Photo & Tagline Header */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="w-36 sm:w-44 aspect-[3/4] rounded-xl overflow-hidden shrink-0 border-2 border-[#D4AF37] shadow-lg bg-slate-200">
              <img
                src={candidate.photoUrl}
                alt={candidate.fullName}
                className="w-full h-full object-cover object-top"
                onError={(e: any) => {
                  e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
                }}
              />
            </div>
            <div className="text-center sm:text-left space-y-2 flex-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Certified Candidate
              </span>
              <p className="text-sm font-semibold text-[#0B192C] italic">
                &quot;{candidate.campaignTagline}&quot;
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {candidate.campaignDescription}
              </p>
            </div>
          </div>

          {/* Manifesto Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[#0B192C] font-bold border-b border-slate-200 pb-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
              <h4 className="text-sm sm:text-base uppercase tracking-wider">Official Manifesto &amp; Agenda</h4>
            </div>
            <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
              {candidate.manifesto || 'The candidate has pledged adherence to the ELEDA constitutional governance framework and delegate welfare charter.'}
            </div>
          </div>

          {/* Electoral Declaration */}
          <div className="bg-[#0A1128]/5 p-3.5 sm:p-4 rounded-xl border border-[#0A1128]/10 text-[11px] sm:text-xs text-slate-600 flex items-center gap-3">
            <Award className="w-5 h-5 text-[#D4AF37] shrink-0" />
            <p>
              This profile and manifesto have been vetted and approved by the ELEDA 2026 Independent Electoral Committee.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-4 sm:px-6 py-3.5 sm:py-4 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
