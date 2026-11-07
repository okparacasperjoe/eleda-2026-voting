'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Award,
  Users,
  Vote,
  Trophy,
  BarChart3,
  Settings,
  AlertTriangle,
  Lock,
  Unlock,
  Play,
  Pause,
  StopCircle,
  FileText,
  Download,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Upload,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Key,
  ShieldCheck,
  ChevronRight,
  Database,
  Eye,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Election,
  ElectionPosition,
  Candidate,
  User,
  AuditLog,
  ElectionResults,
} from '@/types/election';

export default function AdminPage() {
  const router = useRouter();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'voters'
    | 'candidates'
    | 'positions'
    | 'ballots'
    | 'settings'
    | 'controls'
    | 'statistics'
    | 'results'
    | 'winners'
    | 'audit'
    | 'reports'
    | 'system'
  >('overview');

  // Core Data
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<ElectionPosition[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [resultsData, setResultsData] = useState<ElectionResults | null>(null);
  const [ballotLedger, setBallotLedger] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals & Forms
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [candidateFormData, setCandidateFormData] = useState<any>({
    positionId: '',
    candidateNumber: '01',
    fullName: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    campaignTagline: '',
    campaignDescription: '',
    manifesto: '',
    approvalStatus: 'APPROVED',
  });

  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [positionFormData, setPositionFormData] = useState({
    title: '',
    description: '',
    orderIndex: 1,
    allowAbstain: true,
  });

  const [emergencyReason, setEmergencyReason] = useState('');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilterStatus, setVoterFilterStatus] = useState('ALL');
  const [importCsvText, setImportCsvText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Fetch all administrative data
  const fetchAdminData = async () => {
    try {
      const [authRes, elecRes, votersRes, candRes, logsRes, auditRes, resRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/election'),
        fetch('/api/admin/voters'),
        fetch('/api/admin/candidates'),
        fetch('/api/admin/audit-logs'),
        fetch('/api/election/audit'),
        fetch('/api/election/results'),
      ]);

      const authData = await authRes.json();
      if (!authData.authenticated || authData.user?.role !== 'ADMIN') {
        router.push('/login');
        return;
      }
      setCurrentUser(authData.user);

      const elecData = await elecRes.json();
      setElection(elecData.election);
      setPositions(elecData.positions || []);

      const vData = await votersRes.json();
      setVoters(vData.voters || []);

      const cData = await candRes.json();
      setCandidates(cData.candidates || []);

      const lData = await logsRes.json();
      setAuditLogs(lData.logs || []);

      const aData = await auditRes.json();
      setBallotLedger(aData.ledger || []);

      const rData = await resRes.json();
      setResultsData(rData);
    } catch (err: any) {
      console.error('Failed to load admin data', err);
      showNotice('error', 'Error refreshing administrator dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [router]);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Administrative Control Actions
  const handleControlAction = async (action: string, payload: any = {}) => {
    if (!confirm(`Are you sure you want to perform action: ${action.replace(/_/g, ' ')}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      showNotice('success', data.message || 'Action executed successfully');
      await fetchAdminData();
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setActionLoading(false);
      setShowEmergencyDialog(false);
    }
  };

  // Voter Status update
  const handleVoterApproval = async (voterIds: string[], status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/admin/voters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterIds, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotice('success', data.message);
      fetchAdminData();
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Import Voters from CSV Text
  const handleImportVoters = async () => {
    if (!importCsvText.trim()) return;

    try {
      const lines = importCsvText.trim().split('\n');
      const votersToImport: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Format: Name, Email, Phone, VoterCode
        const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2) {
          // If first row is headers, skip
          if (parts[0].toLowerCase().includes('name') && parts[1].toLowerCase().includes('email')) {
            continue;
          }
          votersToImport.push({
            fullName: parts[0],
            email: parts[1],
            phone: parts[2] || '+234 800 000 0000',
            voterCode: parts[3] || `ELEDA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          });
        }
      }

      if (votersToImport.length === 0) {
        showNotice('error', 'No valid voter records found. Ensure format is: Full Name, Email, Phone, Code');
        return;
      }

      const res = await fetch('/api/admin/voters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voters: votersToImport, autoApprove: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotice('success', data.message);
      setShowImportModal(false);
      setImportCsvText('');
      fetchAdminData();
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Add Candidate
  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidateFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotice('success', 'Candidate registered successfully.');
      setIsCandidateModalOpen(false);
      fetchAdminData();
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Add Position
  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(positionFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotice('success', 'Contested position added successfully.');
      setIsPositionModalOpen(false);
      fetchAdminData();
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  // Generate & Download PDF Report using jsPDF & autoTable
  const downloadPdfReport = async (reportType: string, title: string) => {
    try {
      const res = await fetch(`/api/admin/reports?type=${reportType}&format=json`);
      const { data } = await res.json();

      if (!data || data.length === 0) {
        showNotice('error', 'No data available for this report.');
        return;
      }

      const doc = new jsPDF();
      // Header
      doc.setFontSize(16);
      doc.setTextColor(10, 17, 40);
      doc.text('ELEDA 2026 DIGITAL VOTING ARENA', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(212, 175, 55);
      doc.text('ONE PARTICIPANT. ONE VOTE. ONE VOICE.', 14, 26);

      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.text(title.toUpperCase(), 14, 34);

      doc.setFontSize(8);
      doc.text(`Generated on: ${new Date().toLocaleString()} by Chief Electoral Commissioner`, 14, 40);

      const headers = Object.keys(data[0]);
      const rows = data.map((item: any) => headers.map(h => String(item[h] ?? '')));

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [10, 17, 40], textColor: [243, 198, 35] },
        styles: { fontSize: 8, cellPadding: 3 },
      });

      doc.save(`ELEDA_2026_${reportType}.pdf`);
      showNotice('success', `PDF report "${title}" generated successfully.`);
    } catch (err: any) {
      showNotice('error', 'Failed to generate PDF: ' + err.message);
    }
  };

  // Download CSV
  const downloadCsvReport = (reportType: string) => {
    window.open(`/api/admin/reports?type=${reportType}&format=csv`, '_blank');
  };

  // Reset to seed demo data
  const handleResetDatabase = async () => {
    if (!confirm('WARNING: Are you sure you want to reset the database to initial pristine seed data? All custom test votes will be reset.')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/seed-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_DATABASE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotice('success', data.message);
      fetchAdminData();
    } catch (err: any) {
      showNotice('error', err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Loading Administrator Command Center...
        </p>
      </div>
    );
  }

  // Filter voters list
  const filteredVoters = voters.filter(v => {
    const matchesStatus = voterFilterStatus === 'ALL' || v.approvalStatus === voterFilterStatus;
    const matchesSearch =
      v.fullName?.toLowerCase().includes(voterSearch.toLowerCase()) ||
      v.email?.toLowerCase().includes(voterSearch.toLowerCase()) ||
      v.voterCode?.toLowerCase().includes(voterSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Emergency Suspension Switch */}
        <div className="bg-[#0A1128] text-white rounded-3xl p-6 sm:p-8 border border-[#1E3E62] shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#F3C623] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Certified Administrator Arena</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Electoral Control & Integrity Console
            </h1>
            <p className="text-xs text-slate-400">
              Authenticated Officer: <strong className="text-white">{currentUser?.fullName}</strong> ({currentUser?.email})
            </p>
          </div>

          {/* Emergency Suspension Control */}
          <div className="flex flex-wrap items-center gap-3">
            {election?.isEmergencyPaused ? (
              <button
                onClick={() => handleControlAction('OPEN_VOTING')}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center gap-2 animate-pulse"
              >
                <Unlock className="w-4 h-4" />
                Resume Voting Submissions
              </button>
            ) : (
              <button
                onClick={() => setShowEmergencyDialog(true)}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Emergency Voting Suspension
              </button>
            )}

            <button
              onClick={fetchAdminData}
              className="p-2.5 rounded-xl bg-[#1E3E62] hover:bg-[#2D507A] text-white border border-[#2D507A] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Notification */}
        {notification && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-red-50 text-red-900 border-red-300'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 13-Tab Navigation Bar */}
        <div className="bg-white rounded-2xl p-2 shadow-md border border-slate-200 overflow-x-auto flex gap-1 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'voters', label: 'Voters', icon: Users },
            { id: 'candidates', label: 'Candidates', icon: Trophy },
            { id: 'positions', label: 'Positions', icon: Award },
            { id: 'ballots', label: 'Ballot Ledger', icon: Vote },
            { id: 'controls', label: 'Voting Control', icon: Play },
            { id: 'settings', label: 'Schedule & Settings', icon: Settings },
            { id: 'statistics', label: 'Live Statistics', icon: BarChart3 },
            { id: 'results', label: 'Final Results', icon: CheckCircle2 },
            { id: 'winners', label: 'Winner Announcement', icon: Trophy },
            { id: 'audit', label: 'Audit Logs', icon: Shield },
            { id: 'reports', label: 'Reports', icon: FileText },
            { id: 'system', label: 'System & Demo', icon: Database },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2.5 rounded-xl whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#0A1128] text-[#F3C623] shadow-md font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">Status</span>
                <span className="text-xl font-black text-[#0B192C] block mt-1">
                  {election?.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] text-slate-500">
                  {election?.isEmergencyPaused ? 'Emergency Paused' : 'Operating normally'}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">Accredited Voters</span>
                <span className="text-xl font-black text-emerald-600 block mt-1">
                  {voters.filter(v => v.approvalStatus === 'APPROVED').length} / {voters.length}
                </span>
                <span className="text-[11px] text-slate-500">
                  {voters.filter(v => v.approvalStatus === 'PENDING').length} pending approval
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">Ballots Recorded</span>
                <span className="text-xl font-black text-[#D4AF37] block mt-1">
                  {ballotLedger.length}
                </span>
                <span className="text-[11px] text-slate-500">
                  {resultsData?.turnoutPercentage || 0}% delegate turnout
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">Contested Offices</span>
                <span className="text-xl font-black text-[#0B192C] block mt-1">
                  {positions.length} Positions
                </span>
                <span className="text-[11px] text-slate-500">
                  {candidates.length} approved candidates
                </span>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-4">
              <h3 className="text-base font-black text-[#0B192C]">Administrative Command Shortcuts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveTab('controls')}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <Play className="w-5 h-5 text-emerald-600 mb-2" />
                  <p className="font-bold text-xs text-[#0B192C]">Voting State Control</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Open, pause, or close voting</p>
                </button>

                <button
                  onClick={() => setShowImportModal(true)}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <Upload className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="font-bold text-xs text-[#0B192C]">Import Approved Voters</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Upload CSV or tabular list</p>
                </button>

                <button
                  onClick={() => setActiveTab('reports')}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <FileText className="w-5 h-5 text-[#D4AF37] mb-2" />
                  <p className="font-bold text-xs text-[#0B192C]">Download Reports</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Export PDF & CSV summaries</p>
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <Shield className="w-5 h-5 text-purple-600 mb-2" />
                  <p className="font-bold text-xs text-[#0B192C]">Security Audit Stream</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Inspect immutable ledger logs</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VOTERS */}
        {activeTab === 'voters' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-[#0B192C]">Registered Voter Registry</h3>
                <p className="text-xs text-slate-500">
                  Manage voter verification, approve/reject delegates, and import rosters.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-[#F3C623]" />
                  Import CSV List
                </button>
                <button
                  onClick={() => downloadPdfReport('registered_voters', 'Registered Voters Report')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </button>
                <button
                  onClick={() => downloadCsvReport('registered_voters')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, email, or voter code..."
                  value={voterSearch}
                  onChange={e => setVoterSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>

              <select
                value={voterFilterStatus}
                onChange={e => setVoterFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              >
                <option value="ALL">All Statuses ({voters.length})</option>
                <option value="APPROVED">Approved ({voters.filter(v => v.approvalStatus === 'APPROVED').length})</option>
                <option value="PENDING">Pending Review ({voters.filter(v => v.approvalStatus === 'PENDING').length})</option>
                <option value="REJECTED">Rejected ({voters.filter(v => v.approvalStatus === 'REJECTED').length})</option>
              </select>
            </div>

            {/* Voters Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A1128] text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3.5">Voter Code</th>
                    <th className="p-3.5">Full Name</th>
                    <th className="p-3.5">Email / Phone</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Voted</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVoters.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#0B192C]">{v.voterCode}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{v.fullName}</td>
                      <td className="p-3.5 text-slate-500">
                        <div>{v.email}</div>
                        <div className="text-[10px]">{v.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            v.approvalStatus === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : v.approvalStatus === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {v.approvalStatus}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {v.hasVoted ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> YES
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">NO</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {v.approvalStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleVoterApproval([v.id], 'APPROVED')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 mr-1.5"
                          >
                            Approve
                          </button>
                        )}
                        {v.approvalStatus !== 'REJECTED' && (
                          <button
                            onClick={() => handleVoterApproval([v.id], 'REJECTED')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CANDIDATES */}
        {activeTab === 'candidates' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-[#0B192C]">Candidate Management</h3>
                <p className="text-xs text-slate-500">
                  Add, edit, or certify candidates contesting each election position.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCandidateModalOpen(true)}
                  disabled={election?.status === 'VOTING_LIVE'}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4 text-[#F3C623]" />
                  Add New Candidate
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map(c => {
                const pos = positions.find(p => p.id === c.positionId);

                return (
                  <div key={c.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-300 bg-slate-200">
                        <img src={c.photoUrl} alt={c.fullName} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#D4AF37] block">
                          #{c.candidateNumber} • {pos?.title || 'Position'}
                        </span>
                        <h4 className="font-black text-sm text-[#0B192C]">{c.fullName}</h4>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 italic">"{c.campaignTagline}"</p>
                    <div className="pt-2 border-t border-slate-200 text-xs flex justify-between items-center">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {c.approvalStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: POSITIONS */}
        {activeTab === 'positions' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-[#0B192C]">Election Positions</h3>
                <p className="text-xs text-slate-500">Configure offices, ordering, and voting rules.</p>
              </div>
              <button
                onClick={() => setIsPositionModalOpen(true)}
                disabled={election?.status === 'VOTING_LIVE'}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-[#F3C623]" />
                Add Position
              </button>
            </div>

            <div className="space-y-3">
              {positions.map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">Order #{p.orderIndex}</span>
                    <h4 className="font-black text-base text-[#0B192C]">{p.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                  </div>
                  <span className="text-xs text-slate-600 font-semibold bg-white px-3 py-1 rounded-lg border border-slate-200">
                    {p.allowAbstain ? 'Abstentions Allowed' : 'Vote Required'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: BALLOT MANAGEMENT (ANONYMOUS LEDGER) */}
        {activeTab === 'ballots' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-xl font-black text-[#0B192C]">Anonymous Ballot Ledger</h3>
              <p className="text-xs text-slate-500 mt-1">
                Zero-knowledge audit box. Contains verifiable receipt codes and audit hashes with zero voter identity.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A1128] text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Ballot ID</th>
                    <th className="p-3.5">Receipt Verification Code</th>
                    <th className="p-3.5">Cast At</th>
                    <th className="p-3.5">Audit Hash Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ballotLedger.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3.5 text-slate-500">{b.id}</td>
                      <td className="p-3.5 font-bold text-[#0B192C]">{b.receiptCode}</td>
                      <td className="p-3.5 text-slate-600">{new Date(b.castAt).toLocaleString()}</td>
                      <td className="p-3.5 text-slate-400 text-[10px] truncate max-w-xs">{b.auditHash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: VOTING CONTROL */}
        {activeTab === 'controls' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-8">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-xl font-black text-[#0B192C]">Voting State Machine Control</h3>
              <p className="text-xs text-slate-500 mt-1">
                Manage the live operational status of the election.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => handleControlAction('OPEN_VOTING')}
                disabled={actionLoading || election?.status === 'VOTING_LIVE'}
                className="p-5 rounded-2xl border text-left bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900 transition-colors disabled:opacity-40"
              >
                <Play className="w-6 h-6 text-emerald-600 mb-2" />
                <h4 className="font-bold text-sm">Open Voting</h4>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Activate the anonymous voting booth for all accredited delegates.
                </p>
              </button>

              <button
                onClick={() => handleControlAction('PAUSE_VOTING')}
                disabled={actionLoading || election?.status !== 'VOTING_LIVE'}
                className="p-5 rounded-2xl border text-left bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 transition-colors disabled:opacity-40"
              >
                <Pause className="w-6 h-6 text-amber-600 mb-2" />
                <h4 className="font-bold text-sm">Pause Voting</h4>
                <p className="text-[11px] text-amber-700 mt-1">
                  Temporarily halt submissions for routine council verification.
                </p>
              </button>

              <button
                onClick={() => handleControlAction('CLOSE_VOTING')}
                disabled={actionLoading || election?.status === 'VOTING_CLOSED'}
                className="p-5 rounded-2xl border text-left bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 transition-colors disabled:opacity-40"
              >
                <StopCircle className="w-6 h-6 text-slate-700 mb-2" />
                <h4 className="font-bold text-sm">Close Voting</h4>
                <p className="text-[11px] text-slate-600 mt-1">
                  Permanently lock submissions and initiate tally reconciliation.
                </p>
              </button>

              <button
                onClick={() => handleControlAction('PUBLISH_RESULTS')}
                disabled={actionLoading}
                className="p-5 rounded-2xl border text-left bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-900 transition-colors disabled:opacity-40"
              >
                <Trophy className="w-6 h-6 text-purple-600 mb-2" />
                <h4 className="font-bold text-sm">Publish Certified Results</h4>
                <p className="text-[11px] text-purple-700 mt-1">
                  Certify tallies and declare official winners to the general public.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS & SCHEDULE */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-xl font-black text-[#0B192C]">Election Schedule & Visibility Settings</h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure opening/closing dates, timezones, and public result visibility.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Results Visibility Policy (Prompt Section 8)
                </label>
                <select
                  value={election?.resultsVisibility}
                  onChange={e => handleControlAction('UPDATE_SETTINGS', { resultsVisibility: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                >
                  <option value="TURNOUT_ONLY">Turnout Only (Scores Hidden during voting - DEFAULT)</option>
                  <option value="HIDDEN">Completely Hidden (No statistics shown)</option>
                  <option value="LIVE_COUNTS">Live Counts (Candidate votes visible in real-time)</option>
                  <option value="PUBLIC_AFTER_CLOSE">Public After Close (Revealed once voting ends)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Timezone Standard
                </label>
                <input
                  type="text"
                  value={election?.timezone || ''}
                  onChange={e => handleControlAction('UPDATE_SETTINGS', { timezone: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: LIVE STATISTICS */}
        {activeTab === 'statistics' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <h3 className="text-xl font-black text-[#0B192C]">Live Participation Velocity</h3>
            <p className="text-xs text-slate-500">
              Voter turnout is currently at {resultsData?.turnoutPercentage || 0}% ({resultsData?.totalBallotsCast} ballots cast out of {resultsData?.totalVerifiedVoters} verified voters).
            </p>
            <div className="pt-4">
              <Link
                href="/results"
                target="_blank"
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors inline-flex items-center gap-2"
              >
                Open Full Results Arena in New Tab
                <ChevronRight className="w-4 h-4 text-[#F3C623]" />
              </Link>
            </div>
          </div>
        )}

        {/* TAB 9: FINAL RESULTS */}
        {activeTab === 'results' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <h3 className="text-xl font-black text-[#0B192C]">Certified Results Reconciliation</h3>
            <div className="space-y-4">
              {resultsData?.positions.map(p => (
                <div key={p.positionId} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-black text-sm text-[#0B192C]">{p.positionTitle}</h4>
                  <div className="mt-2 text-xs space-y-1">
                    {p.candidates.map(c => (
                      <div key={c.candidateId} className="flex justify-between">
                        <span>#{c.candidateNumber} {c.fullName}</span>
                        <strong className="text-[#0B192C]">{c.voteCount} votes ({c.percentage}%)</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: WINNER ANNOUNCEMENTS */}
        {activeTab === 'winners' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <h3 className="text-xl font-black text-[#0B192C]">Winner Announcements Showcase</h3>
            <p className="text-xs text-slate-500">
              Preview and verify the ceremonial announcement screen.
            </p>
            <Link
              href="/winners"
              target="_blank"
              className="px-6 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#D4AF37] to-[#F3C623] text-[#0A1128] hover:opacity-95 shadow-md inline-flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Launch Winner Announcement Ceremony
            </Link>
          </div>
        )}

        {/* TAB 11: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-[#0B192C]">Immutable Security Audit Stream</h3>
                <p className="text-xs text-slate-500">
                  Real-time tamper-evident log of all electoral events.
                </p>
              </div>
              <button
                onClick={() => downloadPdfReport('audit_log', 'Security Audit Trail')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Audit PDF
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A1128] text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Action Event</th>
                    <th className="p-3.5">Actor</th>
                    <th className="p-3.5">Severity</th>
                    <th className="p-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3.5 font-bold text-[#0B192C]">{l.action}</td>
                      <td className="p-3.5 text-slate-700">{l.actorName || l.actorType}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : l.severity === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {l.severity}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 truncate max-w-xs">{JSON.stringify(l.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 12: REPORTS */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-xl font-black text-[#0B192C]">Official Electoral Reports & Exports</h3>
              <p className="text-xs text-slate-500 mt-1">
                Download certified reports in PDF or CSV formats (Prompt Section 13). No identifiable individual selections are included.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'registered_voters', title: 'Registered Voters Report', desc: 'Complete roster of registered participants and verification status.' },
                { id: 'approved_voters', title: 'Approved Delegates Report', desc: 'Accredited delegates eligible to cast ballots.' },
                { id: 'candidates', title: 'Candidate List Report', desc: 'Official roster of candidates contesting each position.' },
                { id: 'position_results', title: 'Position-by-Position Results', desc: 'Detailed vote counts and percentage shares by position.' },
                { id: 'participation', title: 'Voter Participation Report', desc: 'Turnout metrics and participation statistics.' },
                { id: 'final_summary', title: 'Certified Final Election Summary', desc: 'Official summary document with final declared winners.' },
                { id: 'audit_log', title: 'Electoral Security Audit Report', desc: 'Tamper-evident audit trail of administrative actions.' },
              ].map(rep => (
                <div key={rep.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-black text-sm text-[#0B192C]">{rep.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{rep.desc}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadPdfReport(rep.id, rep.title)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#0A1128] text-white hover:bg-[#1E3E62] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#F3C623]" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => downloadCsvReport(rep.id)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 13: SYSTEM & DEMO */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-xl font-black text-[#0B192C]">System Settings & Demonstration Reset</h3>
              <p className="text-xs text-slate-500 mt-1">
                Cryptographic parameters, database status, and demo scenario controls.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 space-y-3">
              <h4 className="font-black text-sm text-red-900">Reset Database to Seed State</h4>
              <p className="text-xs text-red-700 leading-relaxed">
                Need to restart your test session or showcase from scratch? This clears all test votes, restores the original demo voters and candidates, and reinitializes the cryptographic ledger.
              </p>
              <button
                onClick={handleResetDatabase}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-red-600 text-white hover:bg-red-700 shadow-md"
              >
                Reset Database to Initial Seed
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Suspension Modal */}
      {showEmergencyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-red-900">Emergency Voting Suspension</h3>
              <p className="text-xs text-slate-600">
                This will immediately reject all ongoing and incoming ballot submissions across the platform.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Suspension</label>
              <textarea
                value={emergencyReason}
                onChange={e => setEmergencyReason(e.target.value)}
                placeholder="e.g. Server maintenance, integrity check, or constitutional directive..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmergencyDialog(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleControlAction('EMERGENCY_SUSPEND', { reason: emergencyReason })}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-md"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Voters Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-[#0B192C]">Import Approved Voters (CSV/Text)</h3>
            <p className="text-xs text-slate-500">
              Paste comma-separated rows. Format: <code className="bg-slate-100 px-1 py-0.5 rounded">Full Name, Email, Phone, VoterCode</code>
            </p>
            <textarea
              value={importCsvText}
              onChange={e => setImportCsvText(e.target.value)}
              placeholder={`Babatunde Folarin, b.folarin@eleda2026.org, +2348011112222, ELEDA-2026-7788\nChioma Joy Eze, c.eze@eleda2026.org, +2348022223333, ELEDA-2026-9900`}
              rows={8}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-[#D4AF37]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleImportVoters}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#0A1128] text-white hover:bg-[#1E3E62]"
              >
                Import & Auto-Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-[#0B192C]">Register New Candidate</h3>
            <form onSubmit={handleSaveCandidate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Position Contested</label>
                <select
                  value={candidateFormData.positionId}
                  onChange={e => setCandidateFormData({ ...candidateFormData, positionId: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                >
                  <option value="">Select a position...</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Candidate Number</label>
                <input
                  type="text"
                  value={candidateFormData.candidateNumber}
                  onChange={e => setCandidateFormData({ ...candidateFormData, candidateNumber: e.target.value })}
                  required
                  placeholder="01"
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={candidateFormData.fullName}
                  onChange={e => setCandidateFormData({ ...candidateFormData, fullName: e.target.value })}
                  required
                  placeholder="e.g. Dr. Olumide Adeleke"
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Photograph URL</label>
                <input
                  type="url"
                  value={candidateFormData.photoUrl}
                  onChange={e => setCandidateFormData({ ...candidateFormData, photoUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Campaign Tagline</label>
                <input
                  type="text"
                  value={candidateFormData.campaignTagline}
                  onChange={e => setCandidateFormData({ ...candidateFormData, campaignTagline: e.target.value })}
                  placeholder="Visionary Leadership & Digital Growth"
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Campaign Summary / Bio</label>
                <textarea
                  value={candidateFormData.campaignDescription}
                  onChange={e => setCandidateFormData({ ...candidateFormData, campaignDescription: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Official Manifesto</label>
                <textarea
                  value={candidateFormData.manifesto}
                  onChange={e => setCandidateFormData({ ...candidateFormData, manifesto: e.target.value })}
                  rows={4}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-bold bg-[#0A1128] text-white hover:bg-[#1E3E62]"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Position Modal */}
      {isPositionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-[#0B192C]">Create Contested Position</h3>
            <form onSubmit={handleSavePosition} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Position Title</label>
                <input
                  type="text"
                  value={positionFormData.title}
                  onChange={e => setPositionFormData({ ...positionFormData, title: e.target.value })}
                  required
                  placeholder="e.g. Director of Youth Affairs"
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Description / Responsibilities</label>
                <textarea
                  value={positionFormData.description}
                  onChange={e => setPositionFormData({ ...positionFormData, description: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Order Index</label>
                <input
                  type="number"
                  value={positionFormData.orderIndex}
                  onChange={e => setPositionFormData({ ...positionFormData, orderIndex: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allowAbstainCheck"
                  checked={positionFormData.allowAbstain}
                  onChange={e => setPositionFormData({ ...positionFormData, allowAbstain: e.target.checked })}
                  className="rounded border-slate-300 text-[#D4AF37]"
                />
                <label htmlFor="allowAbstainCheck" className="font-semibold text-slate-700">
                  Allow voters to abstain from this position
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPositionModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-bold bg-[#0A1128] text-white hover:bg-[#1E3E62]"
                >
                  Save Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
