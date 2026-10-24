import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building,
  User,
  CreditCard,
  Banknote,
  ArrowRight,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  HelpCircle,
  Sparkles,
  Shield
} from 'lucide-react';
import LiveBackground from '../components/LiveBackground';

const SUGGESTED_TRACKING_REFS = [
  { id: 'DEMO-AADHAAR-100003', label: 'Arjun Singh (DEMO-AADHAAR-100003)', desc: 'Stage 2: Verification In Progress' },
  { id: 'APP-2026-00001', label: 'APP-2026-00001', desc: 'Sample Application ID' },
  { id: 'DEMO-AADHAAR-100021', label: 'Vikram Singh (Head of H-1005)', desc: 'Completed Stage 6 Disbursement' }
];

const ApplicantTrackerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [inputRef, setInputRef] = useState(
    searchParams.get('ref') || searchParams.get('id') || 'DEMO-AADHAAR-100003'
  );
  const [loading, setLoading] = useState(false);
  const [trackData, setTrackData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const paramRef = searchParams.get('ref') || searchParams.get('id');
    if (paramRef) {
      handleTrack(paramRef);
    } else {
      handleTrack('DEMO-AADHAAR-100003');
    }
  }, []);

  const handleTrack = async (refToSearch) => {
    const q = (refToSearch || inputRef).trim();
    if (!q) return;

    try {
      setLoading(true);
      setError('');
      setTrackData(null);

      const res = await api.get(`/applications/track/${encodeURIComponent(q)}`);
      if (res.data?.success && res.data?.data) {
        setTrackData(res.data.data);
        setSearchParams({ ref: q });
      } else {
        setError('No application record matching this reference was found.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError(
          err.response?.data?.message || 'No application record matching this reference was found in the database.'
        );
      } else {
        setError(err.response?.data?.message || 'Unable to fetch application stage details. Please verify the ID.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleTrack(inputRef);
  };

  const getStageBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
            <Clock className="w-3 h-3 text-blue-600 animate-spin" />
            Current Active Stage
          </span>
        );
      case 'ACTION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold animate-pulse">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Information Required
          </span>
        );
      case 'AWAITING_TREASURY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
            <Banknote className="w-3 h-3 text-purple-600" />
            Queued for Treasury DBT
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
            Not Approved
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
            Pending Stage
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col relative font-sans">
      <LiveBackground />

      {/* Top Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-3 relative z-20 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                <span>JANSETU</span>
                <span className="text-[10px] font-mono bg-teal-500/30 text-teal-300 border border-teal-500/40 px-1.5 py-0.2 rounded font-bold">
                  APPLICANT TRACKER
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Transparent Citizen Application Stage & Lifecycle Tracker
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              Officer Portal &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 relative z-10 flex-1">
        {/* Tracking Header & Search Box */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
              READ-ONLY APPLICANT INQUIRY
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Track Your Application Stage
            </h1>
            <p className="text-xs text-slate-500">
              Enter your Application ID (e.g. <span className="font-mono text-slate-800 font-bold">APP-2026-00001</span>) or Synthetic Demo Identifier (<span className="font-mono text-slate-800 font-bold">DEMO-AADHAAR-100003</span>) to check the real-time stage of your application.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={inputRef}
                onChange={(e) => setInputRef(e.target.value)}
                placeholder="Enter Application ID or Demo Identifier"
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-hidden font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Track Stage</span>
                  <ArrowRight className="w-4 h-4 text-teal-400" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Reference Chips */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Quick Demo Searches:</span>
            {SUGGESTED_TRACKING_REFS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setInputRef(s.id);
                  handleTrack(s.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition ${
                  inputRef === s.id
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <strong className="block font-bold">Application Record Not Found</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <RefreshCw className="w-7 h-7 text-teal-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Retrieving application lifecycle stages...</p>
            <p className="text-xs text-slate-400">Verifying records against government databases</p>
          </div>
        )}

        {/* Tracking Details View */}
        {!loading && trackData && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                      {trackData.applicationId}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      (Gateway Ref: {trackData.sourceSystemReference || 'N/A'})
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {trackData.schemeName}
                  </h2>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>Applicant: <strong>{trackData.applicantName}</strong></span>
                    <span>&bull;</span>
                    <span>Scope: <strong className="font-mono text-teal-700">{trackData.benefitScope}</strong></span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Current Lifecycle Status</div>
                  <div className="mt-1">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-900 text-white shadow-xs">
                      {trackData.currentStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Applied on: {new Date(trackData.applicationDate).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Progress Stepper Bar (6 Statutory Stages) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                    Statutory Lifecycle Stages (Stage {trackData.currentStage} of 6)
                  </span>
                  <span className="text-teal-700 font-bold text-[11px]">
                    {trackData.currentStatus === 'BENEFIT_DISBURSED' ? '100% Completed' : `Stage ${trackData.currentStage} Active`}
                  </span>
                </div>

                {/* Visual Step Dots */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
                  {trackData.stages.map((st) => (
                    <div
                      key={st.stageNumber}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        st.status === 'COMPLETED'
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                          : st.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs ring-1 ring-blue-300'
                          : st.status === 'ACTION_REQUIRED'
                          ? 'bg-amber-50 border-amber-300 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-[10px]">
                          STAGE {st.stageNumber}
                        </span>
                        {st.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : st.status === 'IN_PROGRESS' ? (
                          <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                        ) : null}
                      </div>
                      <div className="font-bold text-xs truncate text-slate-900">
                        {st.title.split(' ')[0]} {st.title.split(' ')[1] || ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Stage Progression List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers className="w-4 h-4 text-teal-600" />
                Comprehensive Stage Progress Breakdown
              </h3>

              <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
                {trackData.stages.map((st) => (
                  <div key={st.stageNumber} className="relative flex items-start gap-3 pl-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 z-10 shadow-xs ${
                        st.status === 'COMPLETED'
                          ? 'bg-emerald-600 text-white'
                          : st.status === 'IN_PROGRESS'
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : st.status === 'ACTION_REQUIRED'
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {st.stageNumber}
                    </div>

                    <div className="flex-1 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="font-bold text-xs text-slate-900">
                          {st.title}
                        </div>
                        {getStageBadge(st.status)}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {st.description}
                      </p>
                      {st.date && (
                        <div className="text-[10px] text-slate-400 font-mono pt-1">
                          Timestamp: {new Date(st.date).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmed Fund Disbursement Box (If available) */}
            {trackData.disbursement && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  Direct Benefit Transfer (DBT) Confirmed
                </div>
                <p className="text-emerald-900">
                  Electronic fund transfer of <strong>₹{Number(trackData.disbursement.disbursedAmount).toLocaleString('en-IN')}</strong> has been successfully credited to the registered bank account.
                </p>
                <div className="flex flex-wrap gap-4 font-mono text-[11px] text-emerald-900 pt-1">
                  <span>UTR Reference: <strong>{trackData.disbursement.transactionReference}</strong></span>
                  <span>Voucher: <strong>{trackData.disbursement.disbursementId}</strong></span>
                  <span>Disbursed On: <strong>{new Date(trackData.disbursement.disbursedAt).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            )}

            {/* Read-Only Status History Log */}
            {trackData.statusHistory && trackData.statusHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide text-xs">
                  Official Status Transition Records
                </h4>
                <div className="divide-y divide-slate-100">
                  {trackData.statusHistory.map((h, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{h.from} &rarr; {h.to}</span>
                        {h.note && <p className="text-[11px] text-slate-500 italic mt-0.5">"{h.note}"</p>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanatory Footer Notice */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="w-4 h-4 text-teal-600" />
                Applicant Transparency & Decision Jurisdiction
              </div>
              <p className="text-[11px] leading-relaxed">
                This tracking interface is strictly read-only for citizen visibility and accountability.
                JanSetu serves as an intelligence and verification platform; decisions and fund approvals are made exclusively by authorized government departmental officers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicantTrackerPage;