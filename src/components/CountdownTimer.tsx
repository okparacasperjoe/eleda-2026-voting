'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { ElectionStatus } from '@/types/election';

interface CountdownTimerProps {
  startTime: string;
  endTime: string;
  status: ElectionStatus;
  serverTime?: string;
  timezone?: string;
}

export default function CountdownTimer({
  startTime,
  endTime,
  status,
  serverTime,
  timezone = 'Africa/Lagos (GMT+1)',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCompleted: false,
    mode: 'UNTIL_CLOSE' as 'UNTIL_START' | 'UNTIL_CLOSE' | 'CLOSED',
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now();
      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();

      let targetMs = endMs;
      let mode: 'UNTIL_START' | 'UNTIL_CLOSE' | 'CLOSED' = 'UNTIL_CLOSE';

      if (status === 'VOTING_CLOSED' || status === 'RESULTS_PUBLISHED' || now >= endMs) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isCompleted: true, mode: 'CLOSED' });
        return;
      }

      if (status === 'ELECTION_SCHEDULED' || status === 'VOTING_OPENS_SOON' || now < startMs) {
        targetMs = startMs;
        mode = 'UNTIL_START';
      }

      const diff = Math.max(0, targetMs - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isCompleted: diff <= 0,
        mode,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime, status]);

  const getTitle = () => {
    if (status === 'VOTING_PAUSED') return 'Voting Paused - Clock Frozen';
    if (status === 'VOTING_CLOSED' || status === 'RESULTS_PUBLISHED') return 'Official Voting Window Concluded';
    if (timeLeft.mode === 'UNTIL_START') return 'Countdown to Voting Commencement';
    return 'Voting Arena Closes In';
  };

  return (
    <div className="bg-[#0B192C] border border-[#1E3E62] rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 relative z-10">
        {/* Title and Timezone info */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-[#D4AF37] text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Official Election Chronometer</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">{getTitle()}</h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Timezone: <span className="text-slate-200 font-medium">{timezone}</span> • Server-synchronized clock
          </p>
        </div>

        {/* Counter Blocks */}
        {status === 'VOTING_CLOSED' || status === 'RESULTS_PUBLISHED' ? (
          <div className="flex items-center gap-3 bg-[#070F2B] px-4 py-3 sm:px-6 sm:py-4 rounded-xl border border-[#1E3E62] w-full md:w-auto">
            <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Ballot Submissions Locked</p>
              <p className="text-[11px] sm:text-xs text-slate-400">All votes have been tallied and cryptographically sealed.</p>
            </div>
          </div>
        ) : status === 'VOTING_PAUSED' ? (
          <div className="flex items-center gap-3 bg-amber-950/40 px-4 py-3 sm:px-6 sm:py-4 rounded-xl border border-amber-600/40 w-full md:w-auto">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-wider">Submissions On Hold</p>
              <p className="text-[11px] sm:text-xs text-amber-300/80">Electoral committee has paused timer for verification.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 text-center w-full md:w-auto">
            {/* Days */}
            <div className="bg-[#070F2B] border border-[#1E3E62] rounded-xl px-2 py-2 sm:px-4 sm:py-3 min-w-0">
              <span className="block text-xl sm:text-3xl font-black text-[#F3C623] font-mono">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold">Days</span>
            </div>

            {/* Hours */}
            <div className="bg-[#070F2B] border border-[#1E3E62] rounded-xl px-2 py-2 sm:px-4 sm:py-3 min-w-0">
              <span className="block text-xl sm:text-3xl font-black text-[#F3C623] font-mono">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold">Hours</span>
            </div>

            {/* Minutes */}
            <div className="bg-[#070F2B] border border-[#1E3E62] rounded-xl px-2 py-2 sm:px-4 sm:py-3 min-w-0">
              <span className="block text-xl sm:text-3xl font-black text-[#F3C623] font-mono">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold">Minutes</span>
            </div>

            {/* Seconds */}
            <div className="bg-[#070F2B] border border-[#1E3E62] rounded-xl px-2 py-2 sm:px-4 sm:py-3 min-w-0">
              <span className="block text-xl sm:text-3xl font-black text-white font-mono animate-pulse">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-bold">Seconds</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
