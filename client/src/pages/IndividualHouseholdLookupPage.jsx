import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Search,
  User,
  Home,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Award,
  Scale,
  Calendar,
  DollarSign,
  FileText,
  BadgeCheck,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  AlertCircle,
  Info
} from 'lucide-react';

const SUGGESTED_DEMO_IDS = [
  { id: 'DEMO-AADHAAR-100003', name: 'Arjun Singh', desc: 'Son • Household H-1005 • Active Education Claim' },
  { id: 'DEMO-AADHAAR-100021', name: 'Vikram Singh', desc: 'Head • Household H-1005 • Disbursed Education' },
  { id: 'DEMO-AADHAAR-100001', name: 'Rajesh Kumar', desc: 'Head • Household H-1001 • Primary Roster' },
  { id: 'DEMO-AADHAAR-100002', name: 'Sunita Kumar', desc: 'Spouse • Household H-1001' }
];

const IndividualHouseholdLookupPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [inputDemoId, setInputDemoId] = useState(searchParams.get('demoId') || 'DEMO-AADHAAR-100003');
  const [loading, setLoading] = useState(false);
  const [lookupData, setLookupData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedScheme, setExpandedScheme] = useState(null);
  const [timelineFilter, setTimelineFilter] = useState('ALL');

  useEffect(() => {
    const paramId = searchParams.get('demoId');
    if (paramId) {
      performLookup(paramId);
    } else {
      performLookup('DEMO-AADHAAR-100003');
    }
  }, []);

  const performLookup = async (demoIdToSearch) => {
    const q = (demoIdToSearch || inputDemoId).trim();
    if (!q) return;

    setLoading(true);
    setErrorMessage('');
    setLookupData(null);

    try {
      const res = await api.get(`/individuals/lookup/${encodeURIComponent(q)}`);
      if (res.data?.success && res.data?.data) {
        setLookupData(res.data.data);
        setSearchParams({ demoId: q });
      } else {
        setErrorMessage('NO MATCHING RECORD FOUND IN THE CONFIGURED JANSETU DATA SOURCES.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setErrorMessage(
          'NO MATCHING RECORD FOUND IN THE CONFIGURED JANSETU DATA SOURCES.'
        );
      } else {
        setErrorMessage(err.response?.data?.message || 'Verification lookup failed. Please check your network and session.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performLookup(inputDemoId);
  };

  const handleSelectMember = (memberDemoId) => {
    if (!memberDemoId) return;
    setInputDemoId(memberDemoId);
    performLookup(memberDemoId);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ELIGIBLE':
      case 'APPROVED':
      case 'DISBURSED':
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {status.replace(/_/g, ' ')}
          </span>
        );
      case 'SUBMITTED':
      case 'PENDING':
      case 'VERIFICATION_PENDING':
      case 'UNDER_REVIEW':
      case 'REQUIRES_ALLOCATION_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> {status.replace(/_/g, ' ')}
          </span>
        );
      case 'INELIGIBLE':
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> {status.replace(/_/g, ' ')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status ? status.replace(/_/g, ' ') : 'N/A'}
          </span>
        );
    }
  };

  const ind = lookupData?.individual;
  const hh = lookupData?.household;
  const members = lookupData?.householdMembers || [];
  const indSchemes = lookupData?.individualSchemes || [];
  const hhSchemes = lookupData?.householdSchemes || [];
  const timeline = lookupData?.timeline || [];

  const filteredTimeline = timeline.filter((item) => {
    if (timelineFilter === 'ALL') return true;
    return item.type === timelineFilter || item.status === timelineFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-govTeal-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-navy-800">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-govTeal-500/15 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-govTeal-500/20 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-govTeal-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> Official Verification & Entitlement Gateway
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Individual Identification & Household Scheme Mapping
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Search any synthetic demo identifier to retrieve the verified citizen profile, linked household roster, individual entitlements, shared household benefits, and transparent rule-by-rule eligibility percentages.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Search Box & Quick Chips */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Enter synthetic identifier e.g. DEMO-AADHAAR-100003 or IND-1005"
              value={inputDemoId}
              onChange={(e) => setInputDemoId(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-govTeal-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-govTeal-700 hover:bg-govTeal-800 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Retrieve Entitlements
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick Scenarios:
          </span>
          {SUGGESTED_DEMO_IDS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setInputDemoId(item.id);
                performLookup(item.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition border flex items-center gap-1.5 ${
                inputDemoId === item.id
                  ? 'bg-navy-900 text-white border-navy-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{item.id}</span>
              <span className="text-[11px] font-sans text-slate-400">({item.name})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error or Empty Alert */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-rose-800 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Record Lookup Notification</h4>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-xs">
          <RefreshCw className="w-8 h-8 text-govTeal-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Cross-checking individual & household registers...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving verified civil rosters, previous DBT vouchers, and scheme policies</p>
        </div>
      )}

      {/* Lookup Content */}
      {!loading && lookupData && (
        <div className="space-y-6">
          {/* 1. Individual Profile & 2. Verified Household Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Individual Profile Card */}
            <div className="lg:col-span-6 bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-navy-800 to-govTeal-600 text-white flex items-center justify-center shadow-xs">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{ind?.fullName}</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Demo Record
                      </span>
                    </div>
                    <div className="text-xs font-mono text-govTeal-700 font-bold">
                      {ind?.demoIdentifier} • {ind?.individualId}
                    </div>
                  </div>
                </div>
                {getStatusBadge(ind?.verificationStatus || 'VERIFIED')}
              </div>

              {/* Individual Demographics Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Demographics</span>
                  <span className="font-bold text-slate-800">{ind?.age || 25} yrs • {ind?.gender}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Income Tier</span>
                  <span className="font-bold text-emerald-700">₹{(ind?.annualIncome || 0).toLocaleString('en-IN')}/yr</span>
                  <span className="text-[10px] font-semibold text-slate-500 block">{ind?.incomeCategory || 'BPL'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Employment</span>
                  <span className="font-bold text-slate-800 truncate block">{ind?.employmentStatus || 'INFORMAL'}</span>
                  <span className="text-[10px] text-slate-500">{ind?.educationStatus || 'SECONDARY'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Location</span>
                  <span className="font-bold text-slate-800">{ind?.district}, {ind?.state}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Father / Guardian</span>
                  <span className="font-bold text-slate-800 truncate block">{ind?.fatherName || 'Ramesh Singh'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Civil Aadhaar Ref</span>
                  <span className="font-mono font-bold text-slate-700 block">XXXX-XXXX-4921</span>
                </div>
              </div>
            </div>

            {/* Verified Household Card */}
            <div className="lg:col-span-6 bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-800 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">
                        Household: {hh?.householdId || 'Unattached'}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                        Roster Unit
                      </span>
                    </div>
                    <div className="text-xs font-mono text-purple-700 font-bold">
                      {hh?.householdReference || 'RC-STATE-77001'}
                    </div>
                  </div>
                </div>
                {hh?.verificationStatus === 'VERIFIED' ? (
                  getStatusBadge('VERIFIED')
                ) : (
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                    HOUSEHOLD MEMBERSHIP REQUIRES VERIFICATION.
                  </span>
                )}
              </div>

              {/* Household Metrics Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Family Size</span>
                  <span className="font-bold text-slate-800 text-sm">{members.length} Verified Members</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Household Income</span>
                  <span className="font-bold text-emerald-700 text-sm">₹{(hh?.annualHouseholdIncome || 0).toLocaleString('en-IN')}/yr</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Ration Card #</span>
                  <span className="font-mono font-bold text-slate-800 truncate block">{hh?.rationCardNumber || 'RC-PAT-091'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 col-span-2">
                  <span className="text-slate-400 block font-medium">Registered Address</span>
                  <span className="font-bold text-slate-800 block truncate">{hh?.addressLine1}, {hh?.district}, {hh?.state}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Pincode</span>
                  <span className="font-mono font-bold text-slate-800">{hh?.pincode || '800001'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Household Members Table */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-govTeal-600" />
                  Verified Household Members ({members.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click on any family member to switch perspective and inspect their personal scheme history.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                Unit {hh?.householdId}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Name & Demo Identifier</th>
                    <th className="py-2.5 px-3">Relationship</th>
                    <th className="py-2.5 px-3">Age & Gender</th>
                    <th className="py-2.5 px-3">Income & Category</th>
                    <th className="py-2.5 px-3">Applications</th>
                    <th className="py-2.5 px-3">Benefits Received</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => {
                    const isCurrentSelected = m.demoIdentifier === ind?.demoIdentifier;
                    return (
                      <tr
                        key={m._id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isCurrentSelected ? 'bg-teal-50/50 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {m.fullName}
                            {isCurrentSelected && (
                              <span className="text-[10px] bg-govTeal-600 text-white px-1.5 py-0.2 rounded font-sans font-bold">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-govTeal-700">{m.demoIdentifier}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-purple-900">
                          {m.relationshipToHead}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {m.age} yrs • {m.gender}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-emerald-700">₹{(m.annualIncome || 0).toLocaleString('en-IN')}</span>
                          <span className="text-slate-400 block text-[10px]">{m.incomeCategory}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            {m.applicationCount || 0} Claims
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {m.benefitCount || 0} Disbursed
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{getStatusBadge(m.verificationStatus)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleSelectMember(m.demoIdentifier)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                          >
                            Lookup <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Individual Schemes & Benefits Mapping */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Individual Schemes & Benefits: {ind?.fullName}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    Individual Scope
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Schemes evaluated strictly against personal age, income, and occupation. Benefits granted to other family members do not disqualify this applicant.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Scheme Name & Code</th>
                    <th className="py-2.5 px-3">Claim Status</th>
                    <th className="py-2.5 px-3">Eligibility % Score</th>
                    <th className="py-2.5 px-3">Eligibility Outcome</th>
                    <th className="py-2.5 px-3">Approval Status</th>
                    <th className="py-2.5 px-3">Disbursement Status</th>
                    <th className="py-2.5 px-3">Benefit Amount</th>
                    <th className="py-2.5 px-3 text-right">Action / Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {indSchemes.map((s) => {
                    const isExpanded = expandedScheme === s.scheme?._id;
                    return (
                      <React.Fragment key={s.scheme?._id}>
                        <tr className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <div>{s.scheme?.name}</div>
                            <span className="font-mono text-[11px] text-slate-400">{s.scheme?.code}</span>
                          </td>
                          <td className="py-3 px-3">{getStatusBadge(s.applicationStatus)}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    s.eligibilityPercentage >= 80
                                      ? 'bg-emerald-500'
                                      : s.eligibilityPercentage >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${s.eligibilityPercentage}%` }}
                                />
                              </div>
                              <span className="font-extrabold text-navy-950 font-mono">
                                {s.eligibilityPercentage}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">{getStatusBadge(s.eligibilityResult)}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-700">{s.approvalStatus}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.disbursementStatus === 'DISBURSED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {s.disbursementStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-navy-900">
                            ₹{(s.recordedBenefitAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setExpandedScheme(isExpanded ? null : s.scheme?._id)}
                              className="px-2.5 py-1 text-govTeal-700 hover:text-govTeal-900 text-xs font-bold inline-flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              Audit Details
                            </button>
                          </td>
                        </tr>

                        {/* Audit Proof & Required Corrections Drawer */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={8} className="p-4 border-b border-slate-200">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                <div>
                                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                                    Statutory Eligibility Decision Explanation:
                                  </h4>
                                  <p className="text-xs text-slate-600">{s.explanation || 'All statutory criteria satisfied.'}</p>
                                </div>

                                {/* Required Corrections for Officer */}
                                {s.requiredCorrections && s.requiredCorrections.length > 0 && (
                                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1.5">
                                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                                      Required Corrections for Applicant / Officer Verification:
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 text-amber-800">
                                      {s.requiredCorrections.map((corr, idx) => (
                                        <li key={idx}>
                                          <strong>{corr.rule}:</strong> {corr.issue} — <em>{corr.action}</em>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Missing Documents Checklist */}
                                {s.missingDocuments && s.missingDocuments.length > 0 && (
                                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs space-y-1.5">
                                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                                      <FileText className="w-4 h-4 text-blue-600" />
                                      Documents Required for Sanction:
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                                      {s.missingDocuments.map((doc, idx) => (
                                        <li key={idx}>
                                          <strong>{doc.documentName}:</strong> {doc.reason}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Household Schemes & Benefits Mapping */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Household Schemes & Entitlements: Unit {hh?.householdId}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    Household Scope
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Restricted programs permitting strictly 1 benefit per verified family unit. Multiple claims trigger the Fair Allocation Engine.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Scheme Name</th>
                    <th className="py-2.5 px-3">Household Status</th>
                    <th className="py-2.5 px-3">Eligibility %</th>
                    <th className="py-2.5 px-3">Submitted by Member(s)</th>
                    <th className="py-2.5 px-3">Competing Claims</th>
                    <th className="py-2.5 px-3">Previous Benefit</th>
                    <th className="py-2.5 px-3">Approval</th>
                    <th className="py-2.5 px-3">Disbursement</th>
                    <th className="py-2.5 px-3 text-right">Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hhSchemes.map((s) => (
                    <tr key={s.scheme?._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        <div>{s.scheme?.name}</div>
                        <span className="font-mono text-[11px] text-slate-400">{s.scheme?.code}</span>
                      </td>
                      <td className="py-3 px-3">{getStatusBadge(s.householdEligibilityStatus)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-govTeal-600 rounded-full"
                              style={{ width: `${s.eligibilityPercentage}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-navy-950 font-mono">{s.eligibilityPercentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">{s.submittedByMember}</td>
                      <td className="py-3 px-3">
                        {s.applicationsCount > 1 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {s.applicationsCount} Claims (Competing)
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">{s.applicationsCount} Claim</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.previousBenefit === 'DISBURSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.previousBenefit}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{s.approvalStatus}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{s.disbursementStatus}</td>
                      <td className="py-3 px-3 text-right">
                        {s.applicationsCount > 1 && (
                          <button
                            onClick={() => navigate('/household-allocations')}
                            className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition"
                          >
                            <Scale className="w-3.5 h-3.5" /> Adjudicate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Household Benefit Timeline */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-govTeal-600" />
                  Household Benefit Lifecycle Timeline: Unit {hh?.householdId}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological history of claim intakes, eligibility assessments, sanction orders, and DBT disbursements.
                </p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                {['ALL', 'APPLICATION_SUBMITTED', 'BENEFIT_SANCTIONED', 'BENEFIT_DISBURSED'].map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setTimelineFilter(filterKey)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      timelineFilter === filterKey
                        ? 'bg-navy-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filterKey.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {filteredTimeline.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No timeline events recorded matching the filter.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {filteredTimeline.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <span
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                        item.type === 'BENEFIT_DISBURSED'
                          ? 'bg-emerald-600'
                          : item.type === 'BENEFIT_SANCTIONED'
                          ? 'bg-purple-600'
                          : 'bg-govTeal-600'
                      }`}
                    />
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900">{item.title}</span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{item.description}</p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                        <span>Ref: {item.reference}</span>
                        <span>•</span>
                        <span>Status: <strong className="text-slate-700">{item.status}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualHouseholdLookupPage;
